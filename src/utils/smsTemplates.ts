export function templateNationalities(template: { nationalities?: string[]; nationality: string }): string[] {
  return template.nationalities?.length ? template.nationalities : template.nationality ? [template.nationality] : [];
}

// Nationality search for the Send SMS dialog: narrows the nationality list by
// one or more terms (space, comma or semicolon separated) so the user can
// search "afghani", select it, then search "indian", select it, and so on.
export function filterNationalities(options: string[], query: string): string[] {
  const needles = query.trim().toLowerCase().split(/[\s,;]+/).filter(Boolean);
  if (needles.length === 0) return options;
  return options.filter((option) => {
    const value = option.trim().toLowerCase();
    return needles.some((needle) => value.includes(needle));
  });
}

export function nationalityRecipients(
  drivers: { driver_id: string }[],
  yangoDrivers: { driver_id: string; nationality: string | null }[],
  nationalities: string[],
): string[] {
  const enabled = new Map(drivers.map(driver => [driver.driver_id.trim(), driver.driver_id]));
  const selected = new Set(nationalities.map(value => value.trim().toLowerCase()).filter(Boolean));
  const recipients = new Set<string>();
  for (const driver of yangoDrivers) {
    const id = enabled.get(driver.driver_id.trim());
    if (id && selected.has((driver.nationality || "").trim().toLowerCase())) recipients.add(id);
  }
  return Array.from(recipients);
}