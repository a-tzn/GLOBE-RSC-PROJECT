import { useCallback, useEffect, useRef, useState } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '../styles/driver-premium.css';

const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbyL1kgGWmCcqyn8B0f0JVwnYgc1qqXkN3MZ9Gt2yWUQz24q-xvi5HmN3IEd8CPZHD5l3Q/exec';
const API_BASE_URL = import.meta.env.VITE_GAS_API_URL || DEFAULT_GAS_URL;
const API_DEV_PROXY_PATH = import.meta.env.VITE_GAS_DEV_PROXY_PATH || '/api/gas';
const FORCE_DIRECT_GAS = String(import.meta.env.VITE_GAS_FORCE_DIRECT || '').toLowerCase() === 'true';

async function postTourAction(payload) {
  const shouldUseDevProxy = import.meta.env.DEV && !FORCE_DIRECT_GAS;
  const endpoint = shouldUseDevProxy ? API_DEV_PROXY_PATH : API_BASE_URL;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok || !data?.success) {
    throw new Error(data?.error || `Tour request failed (${response.status})`);
  }
  return data;
}

// Add setActiveTab as the second parameter
export const useSMTour = (authContext = null, setActiveTab = null) => {
  const [tourCompleted, setTourCompleted] = useState(true);
  const [tourEligible, setTourEligible] = useState(false);
  const driverRef = useRef(null);

  const buildDriver = useCallback(() => {
    let settleTimer = null;
    const settleDriverLayout = () => {
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
        settleTimer = null;
      }, 140);
    };

    const waitForElement = (selector, timeoutMs = 1400) => {
      const started = Date.now();
      return new Promise((resolve) => {
        const probe = () => {
          const node = document.querySelector(selector);
          if (node) {
            resolve(node);
            return;
          }
          if (Date.now() - started >= timeoutMs) {
            resolve(null);
            return;
          }
          setTimeout(probe, 40);
        };
        probe();
      });
    };

    const isElementVisible = (node) => {
      if (!node) return false;
      const style = window.getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };

    const waitForVisibleElement = (selector, timeoutMs = 1500) => {
      const started = Date.now();
      return new Promise((resolve) => {
        const probe = () => {
          const node = document.querySelector(selector);
          if (isElementVisible(node)) {
            resolve(node);
            return;
          }
          if (Date.now() - started >= timeoutMs) {
            resolve(node || null);
            return;
          }
          setTimeout(probe, 40);
        };
        probe();
      });
    };

    const waitForTourOpen = (selector, timeoutMs = 1200) => {
      const started = Date.now();
      return new Promise((resolve) => {
        const probe = () => {
          if (isTourOpen(selector)) {
            resolve(true);
            return;
          }
          if (Date.now() - started >= timeoutMs) {
            resolve(false);
            return;
          }
          setTimeout(probe, 40);
        };
        probe();
      });
    };

    const prepareTarget = async (selector, prepareFn = null, timeoutMs = 1600, requireVisible = false) => {
      if (typeof prepareFn === 'function') {
        await prepareFn();
      }
      const node = requireVisible
        ? await waitForVisibleElement(selector, timeoutMs)
        : await waitForElement(selector, timeoutMs);
      if (node?.scrollIntoView) {
        node.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
      }
      settleDriverLayout();
    };

    const isTourOpen = (selector) => {
      const node = document.querySelector(selector);
      return node?.getAttribute('data-tour-open') === 'true';
    };

    const isMenuVisible = (selector) => {
      const node = document.querySelector(selector);
      return isElementVisible(node);
    };

    const ensureTourOpen = async (triggerSelector, panelSelector) => {
      const trigger = document.querySelector(triggerSelector);
      if (!trigger) return;
      if (!isMenuVisible(panelSelector)) {
        trigger.click();
        await waitForTourOpen(panelSelector, 1200);
        await waitForVisibleElement(panelSelector, 1200);
      }
      // If state was stale during a recent close/open cycle, retry once.
      if (!isMenuVisible(panelSelector)) {
        trigger.click();
        await waitForTourOpen(panelSelector, 1200);
        await waitForVisibleElement(panelSelector, 1200);
      }
      settleDriverLayout();
    };
    
    window.__TOUR_ACTIVE__ = true; // Prevents dropdowns from auto-closing

    // Safely close all header menus if they are open
    const closeMenusExcept = async (keep = null) => {
      const exportBtn = document.getElementById('tour-header-export');
      if (keep !== 'export' && exportBtn && isTourOpen('#tour-export-wrap .export-menu')) exportBtn.click();
      
      const notifBtn = document.getElementById('tour-header-notification');
      if (keep !== 'notification' && notifBtn && isTourOpen('#tour-notif-wrap [data-tour-open]')) notifBtn.click();
      
      const profileBtn = document.getElementById('tour-header-profile');
      if (keep !== 'profile' && profileBtn && isTourOpen('#tour-profile-dropdown-content')) profileBtn.click();

      // Let React commit close state before any subsequent open check.
      await new Promise((resolve) => setTimeout(resolve, 60));
    };

    // Helper to safely trigger a tab change before highlighting
    const switchTab = (tabName) => {
      if (typeof setActiveTab === 'function') {
        setActiveTab(tabName);
      }
      void closeMenusExcept();
      settleDriverLayout();
    };

    const openExportMenu = async () => {
      await closeMenusExcept('export');
      await ensureTourOpen('#tour-header-export', '#tour-export-wrap .export-menu');
    };

    const openNotificationMenu = async () => {
      await closeMenusExcept('notification');
      await ensureTourOpen('#tour-header-notification', '#tour-notif-wrap [data-tour-open]');
    };

    const openProfileDropdown = async () => {
      await closeMenusExcept('profile');
      await ensureTourOpen('#tour-header-profile', '#tour-profile-dropdown-content');
    };

    const openPreferencePanel = () => {
      const prefToggle = document.getElementById('tour-header-preference-toggle');
      const panel = document.getElementById('tour-preference-panel-content');
      if (prefToggle && panel && (panel.style.maxHeight === '0px' || panel.style.maxHeight === '')) {
        prefToggle.click();
      }
    };

    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const waitForDataReady = async (timeoutMs = 5000) => {
      const started = Date.now();
      while (window.__SM_TOUR_WAIT_FOR_DATA__ === true) {
        if (Date.now() - started > timeoutMs) break;
        await wait(120);
      }
    };
    const closeTransientUi = async () => {
      window.dispatchEvent(new Event('tour-close-transient'));
      await wait(80);
    };
    const settleOnce = async () => {
      await wait(120);
      window.dispatchEvent(new Event('resize'));
      await wait(30);
    };

    const prepareStepByIndex = async (index) => {
      switch (index) {
        case 1:
        case 2:
        case 3:
        case 4:
        case 8:
        case 9:
        case 10:
        case 11:
        case 12:
        case 13:
          switchTab('input');
          break;
        case 5:
          switchTab('analytics');
          break;
        case 6:
        case 7:
          switchTab('history');
          break;
        case 14:
          await openExportMenu();
          break;
        case 15:
          await openNotificationMenu();
          break;
        case 16:
        case 17:
        case 18:
        case 21:
          await openProfileDropdown();
          break;
        case 19:
        case 20:
        case 22:
          await openProfileDropdown();
          openPreferencePanel();
          break;
        default:
          break;
      }
      await settleOnce();
    };

    return driver({
      showProgress: true,
      animate: true,
      popoverClass: 'luxury-glass-theme',
      overlayColor: 'rgba(0, 0, 0, 0.65)',
      doneBtnText: 'Start Working',
      closeBtnText: 'Skip Tour',
      nextBtnText: 'Next',
      prevBtnText: 'Back',
      onNextClick: async (_el, _step, { driver: d }) => {
        const active = d.getActiveIndex() ?? 0;
        if (!d.hasNextStep()) {
          d.destroy();
          return;
        }
        await closeTransientUi();
        await waitForDataReady();
        const target = active + 1;
        await prepareStepByIndex(target);
        d.moveTo(target);
      },
      onPrevClick: async (_el, _step, { driver: d }) => {
        const active = d.getActiveIndex() ?? 0;
        if (!d.hasPreviousStep()) return;
        await closeTransientUi();
        await waitForDataReady();
        const target = active - 1;
        await prepareStepByIndex(target);
        d.moveTo(target);
      },
      onDestroyStarted: () => {
        window.__TOUR_ACTIVE__ = false;
        window.dispatchEvent(new Event('tour-close-all'));
        
        setTimeout(() => {
          driverRef.current?.destroy();
          setTourCompleted(true);
          postTourAction({ action: 'completeTour', tourType: 'SM', authContext }).catch(err => {
            console.error('Failed to update tour status', err);
          });
        }, 60);
      },
      steps: [
        {
          popover: {
            title: 'Welcome to Storm Masterlist',
            description: 'This dashboard is your workspace for uploading, processing, reviewing, and exporting masterlist deltas.',
            side: 'over',
            align: 'center'
          }
        },
        {
          element: '#tour-sm-tab-input',
          onHighlightStarted: () => switchTab('input'),
          popover: {
            title: 'Input Tab',
            description: 'This is your main workspace. Upload your NMS and UDM files here to begin processing.',
            side: 'right',
            align: 'start'
          }
        },
        {
          element: '#tour-sm-upload-nms',
          onHighlightStarted: () => switchTab('input'),
          popover: {
            title: 'Upload NMS CSV',
            description: 'Start by selecting your NMS source file.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#tour-sm-upload-udm',
          onHighlightStarted: () => switchTab('input'),
          popover: {
            title: 'Upload UDM CSV',
            description: 'Then select the matching UDM file to compare against NMS.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
        element: '#tour-sm-scan-btn',
        onHighlightStarted: () => switchTab('input'),
        popover: {
          title: 'Scan Files',
          description: 'Click Scan Files to process both CSVs and generate the delta results.',
          side: 'bottom',
          align: 'center'
        }
      },
      {
          element: '.carousel-panel:nth-child(2)',
          onHighlightStarted: () => switchTab('analytics'), 
          popover: {
            title: 'Province Analytics',
            description: 'Clicking any province here will instantly filter the table and focus the map on that specific region.',
            side: 'right',
            align: 'start'
          }
        },
        {
          element: '#tour-sm-last-modified',
          onHighlightStarted: () => {
             switchTab('history');
             void closeMenusExcept();
          },
          popover: {
            title: 'Last Database Modification',
            description: 'Track who last uploaded or modified the global database, and exactly when it happened.',
            side: 'right',
            align: 'start'
          }
        },
        {
          element: '#tour-sm-history-list',
          onHighlightStarted: () => prepareTarget('#tour-sm-history-list', () => switchTab('history')),
          popover: {
            title: 'Data History List',
            description: 'Click any history item in this list to instantly load it back into your table.',
            side: 'right',
            align: 'start'
          }
        },
        {
          element: '#tour-sm-stats-cards',
          onHighlightStarted: () => switchTab('input'),
          popover: {
            title: 'Delta Summary Cards',
            description: 'These cards show total validated, verified, new, removed, and discrepancy counts. Click a card to filter.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#tour-sm-preview-filter',
          onHighlightStarted: () => switchTab('input'),
          popover: {
            title: 'Preview Filter',
            description: 'Use Preview Data to quickly switch table views by status.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          // Targets the Ran By Badge if it exists, otherwise driver.js gracefully skips
          element: '.loaded-data-badge',
          onHighlightStarted: () => switchTab('input'),
          popover: {
            title: 'Loaded Data Info',
            description: 'This badge shows exactly who processed the data you are currently viewing, alongside the date and time.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#tour-sm-search',
          onHighlightStarted: () => switchTab('input'),
          popover: {
            title: 'Search Table',
            description: 'Search by PLA ID or name to locate rows faster.',
            side: 'left',
            align: 'start'
          }
        },
        {
          element: '#tour-sm-results-table',
          onHighlightStarted: () => switchTab('input'),
          popover: {
            title: 'Results Table',
            description: 'Click rows to open details, review remarks, and inspect outputs.',
            side: 'top',
            align: 'center'
          }
        },
        {
          element: '#tour-sm-map-expand',
          onHighlightStarted: () => switchTab('input'),
          popover: {
            title: 'Map Expansion',
            description: 'Open a larger map view for location-focused investigation.',
            side: 'left',
            align: 'center'
          }
        },
        {
          element: '#tour-export-wrap',
          onHighlightStarted: () => prepareTarget('#tour-export-wrap', openExportMenu),
          popover: {
            title: 'Export Data',
            description: 'Download your processed results as an Excel file. You can export everything or filter by specific statuses.',
            side: 'bottom',
            align: 'end'
          }
        },
        {
          element: '#tour-notif-wrap',
          onHighlightStarted: () => prepareTarget('#tour-notif-wrap', openNotificationMenu),
          popover: {
            title: 'Notifications',
            description: 'Get alerts when background tasks finish or when new datasets are available from other engineers.',
            side: 'bottom',
            align: 'end'
          }
        },
        {
          element: '#tour-profile-wrap',
          onHighlightStarted: () => prepareTarget('#tour-profile-wrap', openProfileDropdown),
          popover: {
            title: 'Your Workspace Menu',
            description: 'Open this menu to manage your profile, customize themes, and access your preferences.',
            side: 'left',
            align: 'start'
          }
        },
        {
          element: '#tour-theme-toggle',
          onHighlightStarted: () => prepareTarget('#tour-theme-toggle', openProfileDropdown, 1800, true),
          popover: {
            title: 'Theme Toggle',
            description: 'Switch between Dark and Light mode depending on your lighting environment.',
            side: 'left',
            align: 'center'
          }
        },
        {
          element: '#tour-header-preference-toggle',
          onHighlightStarted: () => prepareTarget('#tour-header-preference-toggle', openProfileDropdown, 1800, true),
          popover: {
            title: 'Preferences',
            description: 'Click this to access the Night Shift dimmer sliders and adjust your table row heights.',
            side: 'left',
            align: 'center'
          }
        },
        {
          element: '#tour-night-dimmer',
          onHighlightStarted: () => {
            prepareTarget('#tour-night-dimmer', async () => {
              await openProfileDropdown();
              setTimeout(openPreferencePanel, 70);
            }, 1800, true);
          },
          popover: {
            title: 'Night Shift & Brightness',
            description: 'Reduce eye strain by enabling Night Shift. Use the sliders to adjust the brightness to your perfect level.',
            side: 'left',
            align: 'center'
          }
        },
        {
          element: '#tour-row-height',
          onHighlightStarted: () => {
            prepareTarget('#tour-row-height', async () => {
              await openProfileDropdown();
              setTimeout(openPreferencePanel, 70);
            }, 1800, true);
          },
          popover: {
            title: 'Table Row Height',
            description: 'Adjust this slider to make the table rows taller or more compact based on your screen size.',
            side: 'left',
            align: 'center'
          }
        },
        {
          element: '#tour-processed-data',
          onHighlightStarted: () => prepareTarget('#tour-processed-data', openProfileDropdown, 1800, true),
          popover: {
            title: 'Your Processed Data',
            description: 'Quickly access and reload the datasets that you personally processed without digging through the global history.',
            side: 'left',
            align: 'center'
          }
        },
        {
          element: '#tour-sm-guide-btn',
          onHighlightStarted: () => {
            prepareTarget('#tour-sm-guide-btn', async () => {
              await openProfileDropdown();
              setTimeout(openPreferencePanel, 70);
            }, 1800, true);
          },
          popover: {
            title: 'Replay This Guide',
            description: 'Use this button anytime to restart the dashboard walkthrough.',
            side: 'left',
            align: 'center'
          }
        }
      ]
    });
  }, [authContext, setActiveTab]);

  const startTour = useCallback(() => {
    const start = async () => {
      const started = Date.now();
      while (window.__SM_TOUR_WAIT_FOR_DATA__ === true && Date.now() - started < 5000) {
        await new Promise((resolve) => setTimeout(resolve, 120));
      }
      if (!driverRef.current) driverRef.current = buildDriver();
      driverRef.current.drive();
    };
    void start();
  }, [buildDriver]);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await postTourAction({ action: 'getTourStatus', authContext });
        const completed = res?.data?.smTourCompleted === true;
        setTourCompleted(completed);
        setTourEligible(!completed);
      } catch (error) {
        console.error('Failed to fetch SM tour status:', error);
      }
    };
    checkStatus();
  }, [authContext]);

  useEffect(() => {
    if (!tourEligible || tourCompleted) return;
    const timer = setTimeout(() => {
      startTour();
    }, 500);
    return () => clearTimeout(timer);
  }, [tourCompleted, tourEligible, startTour]);

  return { startTour };
};
