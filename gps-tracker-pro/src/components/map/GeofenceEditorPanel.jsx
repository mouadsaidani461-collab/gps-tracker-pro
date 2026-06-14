import {
  Trash2, MapPin, Crosshair, RotateCcw, Circle as CircleIcon, Hexagon, Undo2, Check, Link2,
} from 'lucide-react';
import {
  GEOFENCE_COLORS,
  GEOFENCE_DEFAULTS,
  MOROCCO_CITY_PRESETS,
} from '../../utils/constants';
import { useLocale } from '../../context/LocaleContext';
import { formatNumber, NUMERIC_DISPLAY_CLASS } from '../../utils/formatters';
import { geofenceSummary, isCircleGeofence, isPolygonGeofence, sameGeofenceId } from '../../utils/geofenceUtils';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

function formatRadius(meters, t) {
  if (meters >= 1000) {
    return `${formatNumber(meters / 1000, { maximumFractionDigits: 1 })} ${t('geofence.km')}`;
  }
  return `${formatNumber(meters, { maximumFractionDigits: 0 })} ${t('geofence.m')}`;
}

export default function GeofenceEditorPanel({
  geofences,
  selectedGeofence,
  selectedId,
  drawMode,
  polygonDraft = [],
  loading = false,
  saving = false,
  error = null,
  onSelect,
  onUpdate,
  onDelete,
  onStartCreateCircle,
  onStartCreatePolygon,
  onStartReposition,
  onCancelDraw,
  onUndoPolygonPoint,
  onFinishPolygon,
  onAddPreset,
  onRefresh,
  onFlyTo,
  vehicles = [],
  linkedDeviceIds = [],
  linksLoading = false,
  onToggleDeviceLink,
}) {
  const { t } = useLocale();
  const canFinishPolygon = polygonDraft.length >= GEOFENCE_DEFAULTS.minPolygonPoints;
  const isBusy = loading || saving;

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      {error && (
        <div className="shrink-0 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
          {error}
        </div>
      )}

      {loading && (
        <div className="shrink-0 px-3 py-2 rounded-lg bg-capture-card/40 border border-slate-600/20 text-xs text-capture-metallic">
          {t('geofence.loading')}
        </div>
      )}

      {saving && (
        <div className="shrink-0 px-3 py-2 rounded-lg bg-capture-primary/10 border border-capture-primary/20 text-xs text-capture-glow">
          {t('geofence.saving')}
        </div>
      )}

      <div className="flex flex-wrap gap-2 shrink-0">
        <button
          type="button"
          onClick={onStartCreateCircle}
          disabled={isBusy}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium',
            'bg-capture-primary/15 text-capture-glow border border-capture-primary/30',
            'hover:bg-capture-primary/25 transition-colors',
            drawMode === 'create-circle' && 'ring-2 ring-capture-primary/50',
          )}
        >
          <CircleIcon className="w-3.5 h-3.5" />
          {t('geofence.circle')}
        </button>
        <button
          type="button"
          onClick={onStartCreatePolygon}
          disabled={isBusy}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium',
            'bg-violet-500/15 text-violet-300 border border-violet-500/30',
            'hover:bg-violet-500/25 transition-colors',
            drawMode === 'create-polygon' && 'ring-2 ring-violet-400/50',
          )}
        >
          <Hexagon className="w-3.5 h-3.5" />
          {t('geofence.polygon')}
        </button>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isBusy}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-slate-400 border border-slate-600/30 hover:text-slate-200 hover:border-slate-500/40 transition-colors disabled:opacity-50"
          title={t('geofence.refreshTitle')}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {t('geofence.refresh')}
        </button>
      </div>

      {drawMode && (
        <div className="shrink-0 px-3 py-2.5 rounded-lg bg-capture-primary/10 border border-capture-primary/30 text-xs text-capture-glow space-y-2">
          <div>
            <p className="font-medium mb-1">
              {drawMode === 'create-circle' && t('geofence.drawCircle')}
              {drawMode === 'create-polygon' && t('geofence.drawPolygon')}
              {drawMode === 'reposition' && t('geofence.reposition')}
            </p>
            <p className="text-capture-metallic">
              {drawMode === 'create-circle' && t('geofence.clickCircle')}
              {drawMode === 'create-polygon' && t('geofence.clickPolygon')}
              {drawMode === 'reposition' && t('geofence.clickReposition')}
            </p>
          </div>

          {drawMode === 'create-polygon' && (
            <div className="flex flex-wrap gap-2 pt-1">
              <span className={cn('text-[10px] text-slate-300', NUMERIC_DISPLAY_CLASS)} dir="ltr">
                {formatNumber(polygonDraft.length, { maximumFractionDigits: 0 })}
              </span>
              {' '}{t('geofence.point')}
              {polygonDraft.length > 0 && (
                <button
                  type="button"
                  onClick={onUndoPolygonPoint}
                  className="flex items-center gap-1 text-[10px] text-slate-300 hover:text-white"
                >
                  <Undo2 className="w-3 h-3" />
                  {t('geofence.undo')}
                </button>
              )}
              <button
                type="button"
                onClick={onFinishPolygon}
                disabled={!canFinishPolygon}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded text-[10px] ms-auto',
                  canFinishPolygon
                    ? 'bg-capture-success/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-700/30 text-slate-500 cursor-not-allowed',
                )}
              >
                <Check className="w-3 h-3" />
                {t('geofence.finish')}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onCancelDraw}
            className="text-[10px] underline hover:text-white transition-colors"
          >
            {t('common.cancel')}
          </button>
        </div>
      )}

      <div className="shrink-0">
        <p className="text-[10px] text-capture-metallic mb-1.5">{t('geofence.moroccanCities')}</p>
        <div className="flex flex-wrap gap-1.5">
          {MOROCCO_CITY_PRESETS.map((city) => (
            <button
              key={city.id}
              type="button"
              onClick={() => !isBusy && onAddPreset?.({
                ...city,
                name: t(`geofence.cities.${city.id}`),
              })}
              disabled={isBusy}
              className="px-2 py-1 rounded-md text-[10px] bg-capture-bg/60 border border-slate-600/25 text-slate-300 hover:border-capture-primary/40 hover:text-capture-glow transition-colors"
            >
              {t(`geofence.cities.${city.id}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
        <p className={cn('text-[10px] text-capture-metallic sticky top-0 bg-capture-surface/95 py-1', NUMERIC_DISPLAY_CLASS)}>
          <span dir="ltr">{formatNumber(geofences.length, { maximumFractionDigits: 0 })}</span>
          {' '}{t('geofence.zoneCount')}
        </p>

        {geofences.map((gf) => {
          const isSelected = sameGeofenceId(selectedId, gf.id);
          const TypeIcon = isPolygonGeofence(gf) ? Hexagon : CircleIcon;
          return (
            <button
              key={gf.id}
              type="button"
              onClick={() => onSelect?.(gf.id)}
              className={cn(
                'w-full text-start p-3 rounded-xl border transition-all',
                isSelected
                  ? 'bg-capture-primary/10 border-capture-primary/40 shadow-glow-sm'
                  : 'bg-capture-card/40 border-slate-600/20 hover:border-slate-500/40',
              )}
            >
              <div className="flex items-start gap-2">
                <span
                  className="w-3 h-3 rounded-full mt-0.5 shrink-0 ring-2 ring-white/10"
                  style={{ backgroundColor: gf.color ?? GEOFENCE_COLORS[0] }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-100 truncate">{gf.name}</p>
                  <p className={cn('text-[10px] text-capture-metallic mt-0.5', NUMERIC_DISPLAY_CLASS)}>
                    {geofenceSummary(gf, formatNumber, t)}
                  </p>
                </div>
                <TypeIcon className="w-3.5 h-3.5 text-capture-metallic shrink-0" />
              </div>
            </button>
          );
        })}

        {geofences.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-8">
            {t('geofence.empty')}
          </p>
        )}
      </div>

      {selectedGeofence && (
        <div className="shrink-0 pt-3 border-t border-slate-600/20 space-y-3">
          <p className="text-xs font-semibold text-slate-200">
            {t('geofence.editTitle')}
            <span className="text-capture-metallic font-normal ms-1">
              ({isPolygonGeofence(selectedGeofence) ? t('geofence.polygon') : t('geofence.circle')})
            </span>
          </p>

          <label className="block">
            <span className="text-[10px] text-capture-metallic">{t('geofence.name')}</span>
            <input
              type="text"
              value={selectedGeofence.name}
              onChange={(e) => onUpdate?.(selectedGeofence.id, { name: e.target.value })}
              className="mt-1 w-full px-3 py-2 rounded-lg text-sm bg-capture-bg/60 border border-slate-600/30 text-slate-200 focus:outline-none focus:border-capture-primary/50"
            />
          </label>

          {isCircleGeofence(selectedGeofence) && (
            <label className="block">
              <span className="text-[10px] text-capture-metallic flex justify-between">
                <span>{t('geofence.radius')}</span>
                <span className={NUMERIC_DISPLAY_CLASS}>{formatRadius(selectedGeofence.radius, t)}</span>
              </span>
              <input
                type="range"
                min={GEOFENCE_DEFAULTS.minRadius}
                max={GEOFENCE_DEFAULTS.maxRadius}
                step={100}
                value={selectedGeofence.radius}
                onChange={(e) => onUpdate?.(selectedGeofence.id, { radius: Number(e.target.value) })}
                className="mt-2 w-full accent-capture-primary"
              />
            </label>
          )}

          {isPolygonGeofence(selectedGeofence) && (
            <p className={cn('text-xs text-capture-metallic', NUMERIC_DISPLAY_CLASS)}>
              <span dir="ltr">
                {formatNumber(selectedGeofence.coordinates?.length ?? 0, { maximumFractionDigits: 0 })}
              </span>
              {' '}{t('geofence.pointsHint')}
            </p>
          )}

          <div>
            <span className="text-[10px] text-capture-metallic">{t('geofence.color')}</span>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {GEOFENCE_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => onUpdate?.(selectedGeofence.id, { color })}
                  className={cn(
                    'w-7 h-7 rounded-full border-2 transition-transform hover:scale-110',
                    selectedGeofence.color === color ? 'border-white scale-110' : 'border-transparent',
                  )}
                  style={{ backgroundColor: color }}
                  aria-label={t('geofence.colorAria', { color })}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] text-capture-metallic mb-2 flex items-center gap-1.5">
              <Link2 className="w-3 h-3" />
              {t('geofence.linkDevices')}
            </p>
            {linksLoading && (
              <p className="text-[10px] text-capture-metallic mb-2">{t('geofence.loadingLinks')}</p>
            )}
            <div className="max-h-32 overflow-y-auto space-y-1.5">
              {vehicles.length === 0 ? (
                <p className="text-[10px] text-slate-500">{t('geofence.noDevices')}</p>
              ) : (
                vehicles.map((vehicle) => {
                  const deviceId = vehicle.deviceId ?? Number(vehicle.id);
                  const linked = linkedDeviceIds.includes(deviceId);
                  return (
                    <label
                      key={vehicle.id}
                      className={cn(
                        'flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs cursor-pointer border',
                        linked
                          ? 'bg-capture-primary/10 border-capture-primary/30 text-capture-glow'
                          : 'bg-capture-bg/40 border-slate-600/20 text-slate-300',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={linked}
                        onChange={() => onToggleDeviceLink?.(deviceId)}
                        disabled={linksLoading}
                        className="accent-capture-primary"
                      />
                      <span className="truncate">{vehicle.name}</span>
                    </label>
                  );
                })
              )}
            </div>
            <p className="text-[10px] text-slate-500 mt-2">
              {t('geofence.linkHint')}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => onFlyTo?.(selectedGeofence)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] bg-capture-bg/60 border border-slate-600/30 text-slate-300 hover:text-capture-glow transition-colors"
            >
              <Crosshair className="w-3 h-3" />
              {t('geofence.center')}
            </button>
            {isCircleGeofence(selectedGeofence) && (
              <button
                type="button"
                onClick={onStartReposition}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] border transition-colors',
                  drawMode === 'reposition'
                    ? 'bg-capture-primary/15 border-capture-primary/40 text-capture-glow'
                    : 'bg-capture-bg/60 border-slate-600/30 text-slate-300 hover:text-capture-glow',
                )}
              >
                <MapPin className="w-3 h-3" />
                {t('geofence.moveCenter')}
              </button>
            )}
            <button
              type="button"
              onClick={() => onDelete?.(selectedGeofence.id)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition-colors ms-auto"
            >
              <Trash2 className="w-3 h-3" />
              {t('common.delete')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
