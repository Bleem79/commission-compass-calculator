export function templateNationalities(template: { nationalities?: string[]; nationality: string }): string[] {
  return template.nationalities?.length ? template.nationalities : template.nationality ? [template.nationality] : [];
}

export function nationalityRecipients(
  drivers: { driver_id: string }[],
  yangoDrivers: { driver_id: string; nationality: string | null }[],
  nationalities: string[],
): string[] {
  const enabled = new Set(drivers.map(driver => driver.driver_id));
  const selected = new Set(nationalities.map(value => value.trim().toLowerCase()));
  return Array.from(new Set(yangoDrivers
    .filter(driver => enabled.has(driver.driver_id) && selected.has((driver.nationality || "").trim().toLowerCase()))
    .map(driver => driver.driver_id)));
}