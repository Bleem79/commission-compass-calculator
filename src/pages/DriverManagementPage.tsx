import React, { useState, useEffect, useCallback } from "react";
import { Users, UserCheck, UserX, RefreshCw, CheckCircle2, XCircle, Download, Upload, Loader2, Trash2, KeyRound, Eye, EyeOff, ChevronLeft, ChevronRight, UserPlus, Dices, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ResetDriverPasswordDialog } from "@/components/admin/ResetDriverPasswordDialog";
import { PageLayout } from "@/components/shared/PageLayout";
import { useDriverCredentialsManagement } from "@/hooks/useDriverCredentialsManagement";
import { OsrDriverUploadDialog } from "@/components/admin/OsrDriverUploadDialog";
import { supabase } from "@/integrations/supabase/client";

const DriverManagementPage = () => {
  const {
    drivers, loading, searchTerm, setSearchTerm, updatingId, isUploading, uploadProgress,
    fileInputRef, bulkUpdating, isClearing, resetPasswordDriver, setResetPasswordDriver,
    currentPage, setCurrentPage, PAGE_SIZE, showAddForm, setShowAddForm,
    newDriverId, setNewDriverId, newDriverPassword, setNewDriverPassword,
    isAddingDriver, visiblePasswords, isAdmin, canAccessAdminPages,
    togglePasswordVisibility, generateRandomPassword, fetchDrivers,
    handleAddDriver, toggleDriverStatus, bulkUpdateStatus, clearAllDriverCredentials,
    downloadTemplate, handleFileUpload, filteredDrivers, totalPages, paginatedDrivers,
    enabledCount, disabledCount,
  } = useDriverCredentialsManagement();

  if (!canAccessAdminPages) return null;

  return (
    <PageLayout
      title="Driver Management"
      icon={<Users className="h-6 w-6" />}
      gradient="from-background via-indigo-50/50 to-purple-100/50"
      headerActions={
        isAdmin ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={downloadTemplate} className="text-xs sm:text-sm">
              <Download className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Download CSV Template</span><span className="sm:hidden">Template</span>
            </Button>
            <input type="file" accept=".csv" onChange={handleFileUpload} ref={fileInputRef} className="hidden" />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="text-xs sm:text-sm">
              {isUploading ? <><Loader2 className="h-4 w-4 sm:mr-2 animate-spin" /><span className="hidden sm:inline">Uploading...</span></> : <><Upload className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Upload CSV</span><span className="sm:hidden">Upload</span></>}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowAddForm(!showAddForm)} className="text-xs sm:text-sm">
              <UserPlus className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Add Driver</span><span className="sm:hidden">Add</span>
            </Button>
          </div>
        ) : undefined
      }
    >
      {/* Upload Progress */}
      {isUploading && uploadProgress && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Processing: <span className="font-medium text-primary">{uploadProgress.currentDriverId}</span></span>
                <span className="text-muted-foreground">{uploadProgress.current} / {uploadProgress.total}</span>
              </div>
              <Progress value={(uploadProgress.current / uploadProgress.total) * 100} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Driver Form */}
      {isAdmin && showAddForm && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2"><UserPlus className="h-5 w-5" /> Add Individual Driver Account</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Driver ID</label>
                <Input placeholder="Enter Driver ID (e.g., 113441)" value={newDriverId} onChange={(e) => setNewDriverId(e.target.value)} />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Password</label>
                <div className="flex gap-2">
                  <Input placeholder="Enter or generate password" value={newDriverPassword} onChange={(e) => setNewDriverPassword(e.target.value)} className="font-mono" />
                  <Button variant="outline" size="icon" onClick={generateRandomPassword} title="Generate 6-digit random password" className="shrink-0"><Dices className="h-4 w-4" /></Button>
                </div>
              </div>
              <Button onClick={handleAddDriver} disabled={isAddingDriver} className="shrink-0">
                {isAddingDriver ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
                {isAddingDriver ? "Adding..." : "Add Driver"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="flex items-center gap-4 p-4"><div className="p-3 bg-primary/10 rounded-full"><Users className="h-6 w-6 text-primary" /></div><div><p className="text-sm text-muted-foreground">Total Drivers</p><p className="text-2xl font-bold">{drivers.length}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-4"><div className="p-3 bg-green-100 rounded-full"><UserCheck className="h-6 w-6 text-green-600" /></div><div><p className="text-sm text-muted-foreground">Enabled</p><p className="text-2xl font-bold text-green-600">{enabledCount}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-4"><div className="p-3 bg-destructive/10 rounded-full"><UserX className="h-6 w-6 text-destructive" /></div><div><p className="text-sm text-muted-foreground">Disabled</p><p className="text-2xl font-bold text-destructive">{disabledCount}</p></div></CardContent></Card>
      </div>

      {/* Driver Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="text-lg font-semibold">Driver Accounts</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              {isAdmin && (
                <>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" disabled={isClearing || drivers.length === 0} className="text-destructive border-destructive/30 hover:bg-destructive/10">
                        {isClearing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />} Clear All
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Clear All Driver Credentials?</AlertDialogTitle><AlertDialogDescription>This will permanently delete all {drivers.length} driver credential records.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={clearAllDriverCredentials} className="bg-destructive hover:bg-destructive/90">Yes, Clear All</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <Button variant="outline" size="sm" onClick={() => bulkUpdateStatus('enabled')} disabled={bulkUpdating || drivers.length === 0 || enabledCount === drivers.length}><CheckCircle2 className="h-4 w-4 mr-1" />Enable All</Button>
                  <Button variant="outline" size="sm" onClick={() => bulkUpdateStatus('disabled')} disabled={bulkUpdating || drivers.length === 0 || disabledCount === drivers.length}><XCircle className="h-4 w-4 mr-1" />Disable All</Button>
                </>
              )}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by Driver ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 w-full md:w-64" />
              </div>
              <Button variant="outline" size="icon" onClick={fetchDrivers} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading || bulkUpdating ? (
            <div className="flex items-center justify-center py-8"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /><span className="ml-2 text-muted-foreground">{bulkUpdating ? "Updating drivers..." : "Loading drivers..."}</span></div>
          ) : filteredDrivers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">{searchTerm ? "No drivers found matching your search" : "No drivers registered yet."}</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Driver ID</TableHead>
                      <TableHead>Password</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedDrivers.map((driver) => (
                      <TableRow key={driver.id}>
                        <TableCell className="font-medium">{driver.driver_id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-muted-foreground min-w-[80px]">
                              {visiblePasswords.has(driver.id) ? (driver.password_text || "—") : driver.password_text ? "••••••" : "—"}
                            </span>
                            {driver.password_text && (
                              <button type="button" onClick={() => togglePasswordVisibility(driver.id)} className="text-muted-foreground hover:text-primary transition-colors">
                                {visiblePasswords.has(driver.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={driver.status === 'enabled' ? 'default' : 'secondary'} className={driver.status === 'enabled' ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-destructive/10 text-destructive hover:bg-destructive/10'}>
                            {driver.status === 'enabled' ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{driver.created_at ? new Date(driver.created_at).toLocaleDateString() : 'N/A'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setResetPasswordDriver(driver.driver_id)} title="Reset Password"><KeyRound className="h-4 w-4" /></Button>
                            <span className="text-sm text-muted-foreground mr-2">{driver.status === 'enabled' ? 'Enabled' : 'Disabled'}</span>
                            <Switch checked={driver.status === 'enabled'} onCheckedChange={() => toggleDriverStatus(driver)} disabled={updatingId === driver.id} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {filteredDrivers.length > PAGE_SIZE && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">Showing {((currentPage - 1) * PAGE_SIZE) + 1}-{Math.min(currentPage * PAGE_SIZE, filteredDrivers.length)} of {filteredDrivers.length}</p>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                      .reduce<(number | string)[]>((acc, p, i, arr) => { if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...'); acc.push(p); return acc; }, [])
                      .map((p, i) => typeof p === 'string' ? <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground">…</span> : <Button key={p} variant={p === currentPage ? "default" : "outline"} size="sm" className="min-w-[36px]" onClick={() => setCurrentPage(p)}>{p}</Button>)}
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <ResetDriverPasswordDialog isOpen={!!resetPasswordDriver} onClose={() => setResetPasswordDriver(null)} driverId={resetPasswordDriver || ""} onSuccess={fetchDrivers} />
    </PageLayout>
  );
};

export default DriverManagementPage;
