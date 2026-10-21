export function templateNationalities(template: { nationalities?: string[]; nationality: string }): string[] {
  return template.nationalities?.length ? template.nationalities : template.nationality ? [template.nationality] : [];
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