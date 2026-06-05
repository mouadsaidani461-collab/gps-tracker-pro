import { isPolygonGeofence } from '../../utils/geofenceUtils';
import GeofenceCircle from './GeofenceCircle';
import GeofencePolygon from './GeofencePolygon';

export default function GeofenceShape(props) {
  if (isPolygonGeofence(props.geofence)) {
    return <GeofencePolygon {...props} />;
  }
  return <GeofenceCircle {...props} />;
}
