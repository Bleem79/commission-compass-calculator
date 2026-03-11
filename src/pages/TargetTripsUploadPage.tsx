import React from "react";
import { Download, Upload, Loader2, Target, FileSpreadsheet, ChevronDown, ChevronUp, Trash2, Search, Users, Hash, Calendar, Save, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DriverTierTable from "@/components/driver-portal/DriverTierTable";
import { PageLayout } from "@/components/shared/PageLayout";
import { useTargetTripsData, DEFAULT_TIERS } from "@/hooks/useTargetTripsData";

const TargetTripsUploadPage = () => {
  const {
    isAdmin, canAccessAdminPages, isUploading, selectedFile, uploadProgress,
    fileInputRef, showConfig, setShowConfig, targetConfig, setTargetConfig,
    loading, searchQuery, setSearchQuery, monthFilter, setMonthFilter,
    isClearing, isSavingConfig, selectedDriverId, setSelectedDriverId,
    hasConfigChanges, handleSaveConfig, updateTierValue,
    downloadTemplate, handleFileChange, handleUpload, handleClearAll,
    handleExportToExcel, handleDeleteRecord, filteredRecords,
    totalRecords, totalTarget, uniqueDrivers, uniqueMonths,
  } = useTargetTripsData();

  if (!canAccessAdminPages) return null;

  return (
    <PageLayout
      title="Target Trips"
      icon={<Target className="h-6 w-6" />}
      gradient="from-background via-emerald-50/50 to-teal-50/50"
      headerActions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleExportToExcel} disabled={totalRecords === 0}>
            <FileDown className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Export XLSX</span>
          </Button>
        </div>
      }
    >
      {/* Upload Section - Admin only */}
      {isAdmin && (
        <Card className="mb-6">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Upload Target Trips</h2>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" onClick={downloadTemplate}><Download className="h-4 w-4 mr-2" /> Download Template</Button>
              <div className="relative">
                <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                <Button variant="outline"><Upload className="h-4 w-4 mr-2" /> Upload CSV</Button>
              </div>
              {selectedFile && (
                <Button onClick={handleUpload} disabled={isUploading}>
                  {isUploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing...</> : "Import Now"}
                </Button>
              )}
              <div className="flex-1" />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={totalRecords === 0 || isClearing}><Trash2 className="h-4 w-4 mr-2" /> Clear All</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Clear All Records?</AlertDialogTitle><AlertDialogDescription>This will permanently delete all {totalRecords} target trips records.</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleClearAll} className="bg-destructive hover:bg-destructive/90">Delete All</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            <p className="text-sm text-muted-foreground">CSV columns: Driver ID, Shift, Final Target</p>

            {uploadProgress && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground"><span>Uploading records…</span><span>{uploadProgress.uploaded}/{uploadProgress.total}</span></div>
                <Progress value={uploadProgress.total > 0 ? Math.round((uploadProgress.uploaded / uploadProgress.total) * 100) : 0} />
              </div>
            )}

            {/* Configuration Collapsible */}
            <Collapsible open={showConfig} onOpenChange={setShowConfig}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  <span className="flex items-center gap-2"><Target className="h-4 w-4" /> Target Trips Configuration (Optional)</span>
                  {showConfig ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <div className="bg-muted/50 rounded-lg p-4 space-y-4">
                  <div className="max-w-xs">
                    <Label htmlFor="numberOfDays" className="text-sm font-medium">No. of Days</Label>
                    <Input id="numberOfDays" type="number" min={1} max={31} value={targetConfig.numberOfDays}
                      onChange={(e) => setTargetConfig((prev) => ({ ...prev, numberOfDays: parseInt(e.target.value) || 0 }))} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Target Trips by Tier</Label>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm rounded-lg overflow-hidden">
                        <thead className="bg-muted"><tr><th className="text-left p-2 font-medium">Tier</th><th className="text-center p-2 font-medium">24H</th><th className="text-center p-2 font-medium">12H</th></tr></thead>
                        <tbody>
                          {DEFAULT_TIERS.map((tier) => (
                            <tr key={tier} className="border-t border-border">
                              <td className="p-2 font-medium">{tier}</td>
                              <td className="p-1"><Input type="number" min={0} value={targetConfig.tiers[tier]?.["24H"] || 0} onChange={(e) => updateTierValue(tier, "24H", parseInt(e.target.value) || 0)} className="h-8 text-center" /></td>
                              <td className="p-1"><Input type="number" min={0} value={targetConfig.tiers[tier]?.["12H"] || 0} onChange={(e) => updateTierValue(tier, "12H", parseInt(e.target.value) || 0)} className="h-8 text-center" /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="flex justify-end pt-4 border-t">
                    <Button onClick={handleSaveConfig} disabled={!hasConfigChanges || isSavingConfig}>
                      {isSavingConfig ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : <><Save className="h-4 w-4 mr-2" /> Push Updates</>}
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4 text-center"><Hash className="h-5 w-5 text-primary mx-auto mb-2" /><p className="text-3xl font-bold">{totalRecords.toLocaleString()}</p><p className="text-sm text-muted-foreground">Records</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Target className="h-5 w-5 text-primary mx-auto mb-2" /><p className="text-3xl font-bold">{totalTarget.toLocaleString()}</p><p className="text-sm text-muted-foreground">Total Target</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Users className="h-5 w-5 text-primary mx-auto mb-2" /><p className="text-3xl font-bold">{uniqueDrivers.toLocaleString()}</p><p className="text-sm text-muted-foreground">Unique Drivers</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Calendar className="h-5 w-5 text-primary mx-auto mb-2" /><p className="text-3xl font-bold">{uniqueMonths.length}</p><p className="text-sm text-muted-foreground">Months</p></CardContent></Card>
      </div>

      {/* Search and Filter */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by Driver ID, Name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="All Months" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Months</SelectItem>{uniqueMonths.map((month) => <SelectItem key={month} value={month}>{month}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /><span className="ml-3 text-muted-foreground">Loading records...</span></div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-12"><Target className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" /><p className="text-muted-foreground">No records found</p></div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50">
                <th className="text-left p-4 font-medium">Driver ID</th><th className="text-left p-4 font-medium">Name</th><th className="text-center p-4 font-medium">Shift</th>
                <th className="text-right p-4 font-medium">Target</th><th className="text-right p-4 font-medium">Completed</th><th className="text-left p-4 font-medium">Month</th>
                <th className="text-right p-4 font-medium">Year</th>{isAdmin && <th className="text-center p-4 font-medium">Action</th>}
              </tr></thead>
              <tbody>
                {filteredRecords.slice(0, 50).map((record) => (
                  <tr key={record.id} className="border-b hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setSelectedDriverId(record.driver_id)}>
                    <td className="p-4 font-medium">{record.driver_id}</td>
                    <td className="p-4 text-muted-foreground">{record.driver_name || "-"}</td>
                    <td className="p-4 text-center">
                      {record.shift ? <span className={`px-2 py-1 rounded text-xs font-medium ${record.shift === '24H' ? 'bg-primary/10 text-primary' : 'bg-blue-500/10 text-blue-600'}`}>{record.shift}</span> : <span className="text-muted-foreground">-</span>}
                    </td>
                    <td className="p-4 text-right font-semibold">{record.target_trips}</td>
                    <td className="p-4 text-right text-muted-foreground">{record.completed_trips}</td>
                    <td className="p-4 text-muted-foreground">{record.month}</td>
                    <td className="p-4 text-right text-muted-foreground">{record.year}</td>
                    {isAdmin && (
                      <td className="p-4 text-center">
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDeleteRecord(record.id); }} className="text-destructive hover:text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {filteredRecords.length > 50 && (
          <div className="p-4 text-center text-muted-foreground border-t">Showing 50 of {filteredRecords.length} records</div>
        )}
      </Card>

      {/* Driver Tier Dialog */}
      <Dialog open={!!selectedDriverId} onOpenChange={(open) => !open && setSelectedDriverId(null)}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0"><DialogTitle>Driver Details</DialogTitle></DialogHeader>
          {selectedDriverId && <DriverTierTable driverId={selectedDriverId} />}
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default TargetTripsUploadPage;
