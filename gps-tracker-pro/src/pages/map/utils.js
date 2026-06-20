export function getLatestFleetTimestamp(vehicles) {
  return vehicles.reduce((latest, vehicle) => {
    const ts = new Date(vehicle.lastUpdate).getTime();
    if (!Number.isFinite(ts)) return latest;
    return ts > latest ? ts : latest;
  }, 0);
}
