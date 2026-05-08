import React, { useEffect, useState } from 'react';
import useNetworkPing from '../../hooks/useNetworkPing';

const NIGHT_SHIFT_DIMMER_STORAGE_KEY = 'night_shift_dimmer_v1';

const NIGHT_SHIFT_DIMMER_PRESETS = {
  nightShift: {
    label: 'Night Shift',
    leftEmoji: '🌙',
    defaultBrightness: 0.8,
    contrast: 1.0,
    saturate: 1.0,
    hueRotateDeg: 0,
    sepia: 0
  },
  nightLight: {
    label: 'Night Light',
    leftEmoji: '🟠',
    defaultBrightness: 0.66,
    contrast: 1.0,
    saturate: 0.9,
    hueRotateDeg: 0,
    sepia: 0.15
  }
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function NightShiftDimmerControls({ isDarkMode }) {
  const getInitialState = () => {
    if (typeof window === 'undefined') {
      return {
        enabled: false,
        mode: 'nightShift',
        brightness: NIGHT_SHIFT_DIMMER_PRESETS.nightShift.defaultBrightness
      };
    }

    try {
      const raw = window.localStorage.getItem(NIGHT_SHIFT_DIMMER_STORAGE_KEY);
      if (!raw) {
        return {
          enabled: false,
          mode: 'nightShift',
          brightness: NIGHT_SHIFT_DIMMER_PRESETS.nightShift.defaultBrightness
        };
      }

      const parsed = JSON.parse(raw);
      const nextEnabled = Boolean(parsed?.enabled);
      const nextMode =
        parsed?.mode && NIGHT_SHIFT_DIMMER_PRESETS[parsed.mode] ? parsed.mode : 'nightShift';

      const rawBrightness = Number(parsed?.brightness);
      const nextBrightness = Number.isFinite(rawBrightness)
        ? clamp(rawBrightness, 0.4, 1.0)
        : NIGHT_SHIFT_DIMMER_PRESETS[nextMode].defaultBrightness;

      return { enabled: nextEnabled, mode: nextMode, brightness: nextBrightness };
    } catch {
      return {
        enabled: false,
        mode: 'nightShift',
        brightness: NIGHT_SHIFT_DIMMER_PRESETS.nightShift.defaultBrightness
      };
    }
  };

  const initialState = getInitialState();

  const [enabled, setEnabled] = useState(initialState.enabled);
  const [mode, setMode] = useState(initialState.mode);
  const [brightness, setBrightness] = useState(initialState.brightness);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        NIGHT_SHIFT_DIMMER_STORAGE_KEY,
        JSON.stringify({ enabled, mode, brightness })
      );
    } catch {
      // ignore
    }
  }, [enabled, mode, brightness]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const body = document.body;
    if (!body) return;

    if (!enabled || !isDarkMode) {
      body.classList.remove('night-shift-active');
      body.classList.remove('night-light-active');
      body.style.removeProperty('--night-dimmer-brightness');
      return;
    }

    const preset = NIGHT_SHIFT_DIMMER_PRESETS[mode] || NIGHT_SHIFT_DIMMER_PRESETS.nightShift;
    const nextBrightness = clamp(brightness, 0.4, 1.0);

    body.classList.add('night-shift-active');
    body.classList.toggle('night-light-active', mode === 'nightLight');
    body.style.setProperty('--night-dimmer-brightness', String(nextBrightness));
    body.style.setProperty('--night-dimmer-contrast', String(preset.contrast));
    body.style.setProperty('--night-dimmer-saturate', String(preset.saturate));
    body.style.setProperty('--night-dimmer-hue-rotate', `${preset.hueRotateDeg}deg`);
    body.style.setProperty('--night-dimmer-sepia', String(preset.sepia));

    return () => {
      body.classList.remove('night-shift-active');
      body.classList.remove('night-light-active');
      body.style.removeProperty('--night-dimmer-brightness');
    };
  }, [enabled, mode, brightness, isDarkMode]);

  const isDisabled = !isDarkMode;

  const toggleEnabled = () => {
    setEnabled((v) => !v);
  };

  const setModeWithPreset = (nextMode) => {
    if (!NIGHT_SHIFT_DIMMER_PRESETS[nextMode]) return;
    setMode(nextMode);
    // Keep the “modes feel different immediately” behavior.
    setBrightness(NIGHT_SHIFT_DIMMER_PRESETS[nextMode].defaultBrightness);
  };

  return (
    <div
      style={{
        padding: '10px 12px',
        borderRadius: '14px',
        border: '1px solid var(--border-light)',
         background: isDarkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.03)',
        marginBottom: '14px',
        opacity: isDisabled ? 0.6 : 1,
        pointerEvents: isDisabled ? 'none' : 'auto'
      }}
    >
      <div 
        style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: isExpanded ? '10px' : '0', cursor: 'pointer' }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '-3px' }}>
            🌙 Night Shift Dimmer
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
            {isDisabled ? 'Requires Dark Mode' : 'Reduce glare'}
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); toggleEnabled(); }}
          className="row-hover"
          style={{
            minWidth: '96px',
            borderRadius: '999px',
            padding: '8px 12px',
            border: '1px solid var(--border-light)',
            background: enabled ? 'var(--brand-gradient)' : 'rgba(255,255,255,0.05)',
            color: enabled ? '#fff' : 'var(--text-primary)',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: '0.78rem',
            transition: 'all 0.2s',
            outline: 'none'
          }}
          title="Apply dimmer overlay to the entire app"
        >
          {enabled ? 'On' : 'Off'}
        </button>
      </div>

      {isExpanded && (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {(['nightShift', 'nightLight']).map((m) => {
          const p = NIGHT_SHIFT_DIMMER_PRESETS[m];
          const isActive = mode === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => setModeWithPreset(m)}
              className="row-hover"
              style={{
                flex: '1 1 auto',
                borderRadius: '12px',
                padding: '10px 10px',
                border: `1px solid ${isActive ? 'rgba(255, 255, 255, 0.2)' : 'var(--border-light)'}`,
                background: isActive ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255,255,255,0.03)',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
                minWidth: '116px',
                outline: 'none'
              }}
              title={p.label}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 900, fontSize: '0.78rem' }}>
                  <span aria-hidden="true">{p.leftEmoji}</span>
                  {p.label}
                </span>
                <span style={{ fontSize: '0.66rem', fontWeight: 800, color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {Math.round(p.defaultBrightness * 100)}%
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)' }}>Brightness</div>
        <div style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--text-secondary)' }}>
          {Math.round(brightness * 100)}%
        </div>
      </div>

      <input
        type="range"
        min={0.4}
        max={1.0}
        step={0.01}
        value={brightness}
        onChange={(e) => setBrightness(clamp(Number(e.target.value), 0.4, 1.0))}
        style={{
          width: '100%',
          accentColor: 'var(--brand-purple)',
          outline: 'none'
        }}
        aria-label="Night Shift Dimmer brightness"
      />
        </div>
              )}
            </div>
  );
}

export function DashboardHeaderActions({
  exportDisabled = false,
  showExportMenu = false,
  onToggleExport,
  onCloseExport,
  exportOptions = [],
  onSelectExport,
  isDarkMode = false,
  onToggleTheme,
  showUserDropdown = false,
  onToggleUserDropdown,
  onCloseUserDropdown,
  userName = 'Workspace User',
  userEmail = 'user@globe.com.ph',
  userInitial = 'U',
  firstName = 'USER',
  recentItems = [],
  onLoadRecentItem,
  showNotificationMenu = false,
  onToggleNotification,
  onCloseNotification,
  notifications = [],
  notificationUnreadCount = 0,
  onNotificationAction,
  rowHeight,
  onRowHeightChange,
  onStartTour
}) {
  const { ping, status } = useNetworkPing();
  const pingColor = status === 'good' ? '#28a745' : status === 'fair' ? '#f59e0b' : '#ef4444';
  const pingText = status === 'offline' ? 'Offline' : `${ping} ms`;
  const [isPreferenceExpanded, setIsPreferenceExpanded] = useState(false);

  const disableTransition = typeof window !== 'undefined' && window.__TOUR_ACTIVE__;

  useEffect(() => {
    const handleTourCloseAll = () => {
      onCloseExport?.();
      onCloseNotification?.();
      onCloseUserDropdown?.();
    };
    window.addEventListener('tour-close-all', handleTourCloseAll);
    return () => window.removeEventListener('tour-close-all', handleTourCloseAll);
  }, [onCloseExport, onCloseNotification, onCloseUserDropdown]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (typeof window !== 'undefined' && window.__TOUR_ACTIVE__) return;
      
      if (showExportMenu && !e.target.closest('#tour-export-wrap')) {
        onCloseExport?.();
      }
      if (showNotificationMenu && !e.target.closest('#tour-notif-wrap')) {
        onCloseNotification?.();
      }
      if (showUserDropdown && !e.target.closest('#tour-profile-wrap')) {
        onCloseUserDropdown?.();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportMenu, showNotificationMenu, showUserDropdown, onCloseExport, onCloseNotification, onCloseUserDropdown]);

  return (
    <div className="header-actions" style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', paddingLeft: '16px', overflow: 'visible' }}>

      <div
        onClick={(e) => {
          e.stopPropagation();
          if (window.__TOUR_ACTIVE__) return; // Prevent clicking out during tour
          onCloseExport?.();
          onCloseNotification?.();
          onCloseUserDropdown?.();
        }}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.6)' : 'rgba(15, 23, 42, 0.3)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          zIndex: 40,
          opacity: (showExportMenu || showNotificationMenu || showUserDropdown) ? 1 : 0,
          pointerEvents: (showExportMenu || showNotificationMenu || showUserDropdown) ? 'auto' : 'none',
          transition: 'opacity 0.3s ease'
        }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 0, flex: 1}} />


      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative', zIndex: 45 }}>
        <div
          id="tour-export-wrap"
          className="export-dropdown-container"
          style={{ position: 'relative' }}
          onClick={(e) => e.stopPropagation()}
        >
          <button id="tour-header-export" className="btn theme-toggle" onClick={onToggleExport} disabled={exportDisabled} style={{
            width: '36px', height: '36px', borderRadius: '50%', padding: 0,
            background: 'var(--bg-input)', border: showExportMenu ? '1px solid var(--brand-purple)' : '1px solid var(--border-light)',
            color: showExportMenu ? 'var(--brand-purple)' : 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: exportDisabled ? 'not-allowed' : 'pointer',
            boxShadow: showExportMenu ? '0 0 0 3px rgba(112, 51, 255, 0.2)' : 'none',
            opacity: exportDisabled ? 0.5 : 1, transition: 'all 0.2s ease', outline: 'none',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v9" />
              <polyline points="8 11 12 15 16 11" />
              <path d="M6 18h12" />
            </svg>
          </button>
          <div className="export-menu" style={{
            marginLeft: '-15px',
            position: 'absolute', top: '110%', left: 0, zIndex: 50, marginTop: '20px',
            background: isDarkMode ? 'var(--night-solid-bg, #111C44)' : '#ffffff',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)', borderRadius: '12px', overflow: 'hidden',
            opacity: showExportMenu ? 1 : 0,
            transform: showExportMenu ? 'translateY(0)' : 'translateY(-10px)',
            pointerEvents: showExportMenu ? 'auto' : 'none',
            transition: disableTransition ? 'none' : 'opacity 0.2s ease, transform 0.2s ease'
          }} data-tour-open={showExportMenu ? 'true' : 'false'}>
            {exportOptions.map((option) => (
              <button key={option.value} onClick={() => onSelectExport?.(option.value)} style={{ outline: 'none' }}>
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {(onToggleNotification || notifications.length > 0 || notificationUnreadCount > 0) && (
          <div
            id="tour-notif-wrap"
            className="export-dropdown-container"
            style={{ position: 'relative' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              id="tour-header-notification"
              className="btn theme-toggle"
              onClick={onToggleNotification}
              title="Notifications"
              style={{
                left: 0,
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                padding: 0,
                background: 'var(--bg-input)',
                border: showNotificationMenu ? '1px solid var(--brand-purple)' : '1px solid var(--border-light)',
                boxShadow: showNotificationMenu ? '0 0 0 3px rgba(112, 51, 255, 0.2)' : 'none',
                color: showNotificationMenu ? 'var(--brand-purple)' : 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                outline: 'none',
                position: 'relative'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                <path d="M9.5 17a2.5 2.5 0 0 0 5 0" />
              </svg>
              {notificationUnreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    padding: '3px 7px',
                    borderRadius: '500px',
                    background: 'var(--color-danger)',
                    color: '#fff',
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    lineHeight: 1,
                    boxShadow: '0 0 0 2px var(--bg-sidebar)'
                  }}
                >
                  {notificationUnreadCount > 9 ? '9+' : notificationUnreadCount}
                </span>
              )}
            </button>
            <div
              style={{
                marginTop: '22px',
                position: 'absolute',
                top: '110%',
                right: -86,
                zIndex: 60,
                width: '390px',
                maxHeight: 'calc(100vh - 153px)',
                overflowY: 'auto',
                borderRadius: '20px',
                border: '1px solid var(--border-light)',
                background: isDarkMode ? 'var(--night-solid-bg, #111C44)' : '#ffffff',
                boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                opacity: showNotificationMenu ? 1 : 0,
                transform: showNotificationMenu ? 'translateY(0)' : 'translateY(-10px)',
                pointerEvents: showNotificationMenu ? 'auto' : 'none',
                transition: disableTransition ? 'none' : 'opacity 0.2s ease, transform 0.2s ease'
              }}
              data-tour-open={showNotificationMenu ? 'true' : 'false'}
            >
                <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-light)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', position: 'sticky', top: 0, background: isDarkMode ? 'var(--night-solid-bg, #111C44)' : '#ffffff', zIndex: 1 }}>
                  Notifications
                </div>
                {notifications.length === 0 ? (
                  <div style={{ padding: '14px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    No recent notifications.
                  </div>
                ) : notifications.map((item) => (
                  <div key={item.id} style={{ padding: '11px 14px', borderBottom: '1px solid var(--border-light)', background: item.read ? 'transparent' : (isDarkMode ? 'rgba(26, 115, 232, 0.1)' : 'rgba(26, 115, 232, 0.08)') }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.90rem', fontWeight: 700, color: 'var(--text-primary)' }}>{item.title}</div>
                         <div style={{ fontSize: '0.78rem', marginTop: '10px', color: isDarkMode ? 'var(--text-secondary)' : 'rgb(0, 0, 0)', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>{item.message}</div>
                        <div style={{ fontSize: '0.70rem', fontWeight: 700, marginTop: '5px', color: isDarkMode ? 'var(--text-secondary)' : '#000000', opacity: isDarkMode ? 1 : 0.9 }}> 📅 {item.timestampLabel}</div>
                      </div>
                      {!item.read && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-info)', boxShadow: '0 0 8px var(--color-info)', marginTop: '6px' }} />}
                    </div>
                    {item.actionType && (
                      <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="primary-outline"
                          onClick={() => onNotificationAction?.(item)}
                          style={{ fontSize: '0.68rem', padding: '4px 10px', borderRadius: '999px', outline: 'none' }}
                        >
                          {item.actionLabel || 'Open'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
          </div>
        )}



        <div id="tour-profile-wrap" style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
          <button
            id="tour-header-profile"
            className="user-profile-trigger"
            onClick={onToggleUserDropdown}
            style={{
              display: 'flex', alignItems: 'center', background: 'transparent',
              border: 'none', outline: 'none', cursor: 'pointer', padding: 0, borderRadius: '50%'
            }}
          >
            <div title={userName} style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--brand-purple), #6b21a8)',
              color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 'bold', fontSize: '1.05rem', 
              boxShadow: showUserDropdown ? '0 0 0 3px rgba(112, 51, 255, 0.4), 0 2px 8px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.2)',
              transition: 'box-shadow 0.2s ease'
            }}>
              {userInitial}
            </div>
       
          </button>

          <div style={{
            position: 'absolute', top: '110%', right: -40, zIndex: 1200, width: '360px',
            background: isDarkMode ? 'var(--night-solid-bg, #111C44)' : '#ffffff',
            border: '1px solid var(--border-light)', borderRadius: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            padding: '16px', color: 'var(--text-primary)', fontFamily: '"Google Sans", Roboto, Arial, sans-serif',
            marginTop: '18px',
            opacity: showUserDropdown ? 1 : 0,
            transform: showUserDropdown ? 'translateY(0)' : 'translateY(-10px)',
            pointerEvents: showUserDropdown ? 'auto' : 'none',
            transition: disableTransition ? 'none' : 'opacity 0.2s ease, transform 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 'calc(100vh - 180px)'
          }}
          data-tour-open={showUserDropdown ? 'true' : 'false'}
          id="tour-profile-dropdown-content">
                <div style={{ position: 'relative', textAlign: 'center', marginBottom: '16px', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: '500' }}>{userEmail}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Managed by Globe RSC</div>
                  <button onClick={onCloseUserDropdown} style={{ position: 'absolute', right: '0', top: '-4px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem', outline: 'none' }}>x</button>
                </div>

                <div style={{ position: 'relative', width: '76px', height: '76px', margin: '0 auto 12px auto', flexShrink: 0 }}>
                  <div style={{
                    width: '100%', height: '100%', borderRadius: '50%', background: 'linear-gradient(135deg, var(--brand-purple), #6b21a8)',
                    color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '2rem',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                  }}>
                    {userInitial}
                  </div>
                </div>

                <div style={{ textAlign: 'center', fontSize: '1.4rem', marginBottom: '8px', color: 'var(--text-primary)', flexShrink: 0 }}>Hi, {firstName}!</div>

                <div
                  title={status === 'offline' ? 'Connection appears offline' : `Network latency: ${ping}ms`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 10px',
                    color: 'var(--text-secondary)',
                    fontSize: '0.75rem',
                    minWidth: '88px',
                    justifyContent: 'center'
                  }}
                >
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: pingColor,
                      boxShadow: `0 0 8px ${pingColor}`,
                    }}
                  />
                  <span style={{ lineHeight: 1 }}>{pingText}</span>
                </div>

                <div style={{marginTop: '30px' ,padding: '12px', borderRadius: '14px', border: '1px solid var(--border-light)', background: isDarkMode ? 'var(--bg-input)' : '#f7f0f0', marginBottom: '14px', flexShrink: 0 }}>
                  <div 
                    id="tour-header-preference-toggle"
                    onClick={() => setIsPreferenceExpanded(!isPreferenceExpanded)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '0px 4px', margin: '0px 8px 15px 9px'  }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--text-secondary)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 1v4" /><path d="m16.2 3.8-2.8 2.8" /><path d="M23 12h-4" /><path d="m20.2 16.2-2.8-2.8" /><path d="M12 23v-4" /><path d="m7.8 20.2 2.8-2.8" /><path d="M1 12h4" /><path d="m3.8 7.8 2.8 2.8" />
                      </svg>
                      Preference
                    </div>
                    <svg 
                      width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" 
                      style={{ transform: isPreferenceExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', color: 'var(--text-secondary)' }}
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>

                  {/* Dark mode toggle (moved inside Session) */}
                  <button
                    onClick={() => onToggleTheme?.()}
                    id="tour-theme-toggle"
                    className="row-hover"
                    style={{
                      width: '100%',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      border: '1px solid var(--border-light)',
                      background: isDarkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.03)',
                      fontSize: '0.82rem',
                      fontWeight: '600',
                      textAlign: 'left',
                      cursor: 'pointer',
                      color: 'var(--text-primary)',
                      transition: 'all 0.2s',
                      marginBottom: '10px',
                      outline: 'none'
                    }}
                    title="Toggle Theme"
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        {isDarkMode ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="5"></circle>
                            <line x1="12" y1="1" x2="12" y2="3"></line>
                            <line x1="12" y1="21" x2="12" y2="23"></line>
                            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                            <line x1="1" y1="12" x2="3" y2="12"></line>
                            <line x1="21" y1="12" x2="23" y2="12"></line>
                            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                          </svg>
                        )}
                        <span>{isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        {isDarkMode ? 'On' : 'Off'}
                      </span>
                    </span>
                  </button>

                   <div 
                     id="tour-preference-panel-content"
                     style={{ maxHeight: isPreferenceExpanded ? '500px' : '0px', overflow: 'hidden', transition: disableTransition ? 'none' : 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease', opacity: isPreferenceExpanded ? 1 : 0 }}
                   >
                    {/* Night Shift Dimmer (Night/Dimmer/Reduce glare + slider) */}
                    <div id="tour-night-dimmer">
                      <NightShiftDimmerControls isDarkMode={isDarkMode} />
                    </div>

                    <button id="tour-sm-guide-btn" type="button" className="btn primary-outline full-width" onClick={onStartTour} style={{ margin: '0px 0px 12px 0px', padding: '5px' }}>
                      Show guide
                    </button>
                  </div>


                  {/* Row Height Control */}
                  {typeof rowHeight !== 'undefined' && typeof onRowHeightChange === 'function' && (
                       <div id="tour-row-height" style={{ padding: '10px 12px', borderRadius: '14px', border: '1px solid var(--border-light)', background: isDarkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.03)', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"/></svg>
                          Row Height
                        </div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)' }}>
                          {rowHeight}px
                        </div>
                      </div>
                      <input
                        type="range"
                        min={24}
                        max={70}
                        step={1}
                        value={rowHeight}
                        onChange={(e) => onRowHeightChange(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--brand-purple)', outline: 'none' }}
                        aria-label="Table Row Height"
                      />
                    </div>
                  )}

                </div>

                <div id="tour-processed-data" style={{ padding: '10px 12px', borderRadius: '14px', border: '1px solid var(--border-light)', background: isDarkMode ? 'var(--bg-input)' : '#f7f0f0', marginBottom: '0', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0px 8px 15px 14px', flexShrink: 0 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--text-secondary)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      Your Processed Data
                    </div>
                    <div style={{
                      fontSize: '0.68rem',
                      borderRadius: '999px',
                      border: '1px solid var(--border-light)',
                      color: 'var(--text-secondary)',
                      padding: '2px 8px',
                    }}>
                      {Math.min(recentItems.length, 5)}
                    </div>
                  </div>

                  <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', borderTop: '1px solid var(--border-light)', margin: '0px 0px 0px -5px'}}>
                    {recentItems.length > 0 ? recentItems.slice(0, 5).map((item, index) => (
                      <button
                        key={item.id}
                        onClick={() => { onLoadRecentItem?.(item); onCloseUserDropdown?.(); }}
                        className="row-hover"
                        style={{
                          width: '100%',
                          background: 'transparent',
                          border: 'none',
                          borderBottom: index === Math.min(recentItems.length, 5) - 1 ? 'none' : '1px solid var(--border-light)',
                          padding: '12px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'background 0.2s',
                          outline: 'none'
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>

                        <div style={{ flex: 1, minWidth: 0, paddingRight: '8px' }}>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.fileName}</div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px', flexWrap: 'wrap' }}>
                            <span>{new Date(item.uploadDate).toLocaleDateString()} {new Date(item.uploadDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <span style={{ color: 'var(--border-light)', display: 'none' }}>•</span>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'space-between',
                              padding: '2px 8px',
                              borderRadius: '999px',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              background: 'rgba(var(--color-info-rgb, 26, 115, 232), 0.15)',
                              color: 'var(--color-info)',
                              whiteSpace: 'nowrap'
                            }}>
                              {item.processedCount ?? item.metadata?.processedRecords ?? 0} rows
                            </span>
                          </div>
                        </div>
                      </button>
                    )) : (
                      <div style={{ padding: '16px 8px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                        You haven't processed any files recently.
                      </div>
                    )}
                  </div>
                </div>
              </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardHeaderActions;
