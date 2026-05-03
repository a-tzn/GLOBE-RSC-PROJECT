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

export const useSATour = (authContext = null, setActiveTab = null) => {
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
      if (!isMenuVisible(panelSelector)) {
        trigger.click();
        await waitForTourOpen(panelSelector, 1200);
        await waitForVisibleElement(panelSelector, 1200);
      }
      settleDriverLayout();
    };
    
    window.__TOUR_ACTIVE__ = true;

    const closeMenusExcept = async (keep = null) => {
      const exportBtn = document.getElementById('tour-header-export');
      if (keep !== 'export' && exportBtn && isTourOpen('#tour-export-wrap .export-menu')) exportBtn.click();
      
      const notifBtn = document.getElementById('tour-header-notification');
      if (keep !== 'notification' && notifBtn && isTourOpen('#tour-notif-wrap [data-tour-open]')) notifBtn.click();
      
      const profileBtn = document.getElementById('tour-header-profile');
      if (keep !== 'profile' && profileBtn && isTourOpen('#tour-profile-dropdown-content')) profileBtn.click();

      await new Promise((resolve) => setTimeout(resolve, 60));
    };

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
      while (window.__SA_TOUR_WAIT_FOR_DATA__ === true) {
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
        case 5:
        case 6:
        case 7:
        case 8:
          switchTab('input');
          break;
        case 9:
        case 10:
        case 11:
        case 12:
          switchTab('analytics');
          break;
        case 13:
        case 14:
        case 15:
          switchTab('history');
          break;
        case 16:
          await openExportMenu();
          break;
        case 17:
          await openNotificationMenu();
          break;
        case 18:
        case 19:
        case 20:
        case 23:
          await openProfileDropdown();
          break;
        case 21:
        case 22:
        case 24:
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
          postTourAction({ action: 'completeTour', tourType: 'SA', authContext }).catch(err => {
            console.error('Failed to update tour status', err);
          });
        }, 60);
      },
      steps: [
        {
          popover: {
            title: 'Welcome to the Site Alert Dashboard',
            description: 'This is your centralized command center for monitoring, categorizing, and analyzing network site alarms.',
            side: 'over',
            align: 'center'
          }
        },
        {
          element: '#tour-sa-tab-input',
          onHighlightStarted: () => switchTab('input'),
          popover: {
            title: 'Data Input Panel',
            description: 'Upload your raw alarm logs here to initiate the parsing and categorization engine.',
            side: 'right',
            align: 'start'
          }
        },
        {
          element: '#tour-sa-mode-toggle',
          onHighlightStarted: () => switchTab('input'),
          popover: {
            title: 'Network Mode Switcher',
            description: 'Swap Wireless and Transport here. Transport uses one upload dropbox; Wireless uses two.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#tour-sa-upload-section',
          onHighlightStarted: () => switchTab('input'),
          popover: {
            title: 'Upload Source Logs',
            description: 'Upload alarm source files here. In Transport mode, this is the only required upload box.',
            side: 'bottom',
            align: 'center'
          }
        },
        {
          element: '#tour-sa-scan-btn',
          onHighlightStarted: () => switchTab('input'),
          popover: {
            title: 'Analyze Data',
            description: 'Click here to process the uploaded logs and generate the severity and hotspot analysis.',
            side: 'bottom',
            align: 'center'
          }
        },
        {
          element: '#tour-sa-search',
          onHighlightStarted: () => switchTab('input'),
          popover: {
            title: 'Search & Filter',
            description: 'Quickly narrow down alarms by ID, site name, or alarm text.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#tour-sa-results-table',
          onHighlightStarted: () => switchTab('input'),
          popover: {
            title: 'Shared Results Table',
            description: 'Review alarms here. Clicking a row opens Details, and the Count badge opens drilldown.',
            side: 'top',
            align: 'center'
          }
        },
        {
          element: '#tour-sa-sidebar-collapse',
          onHighlightStarted: () => switchTab('input'),
          popover: {
            title: 'Collapse Sidebar',
            description: 'Use this to hide the sidebar and focus on table analysis.',
            side: 'left',
            align: 'center'
          }
        },
        {
          element: '#tour-sa-drilldown',
          onHighlightStarted: () => switchTab('input'),
          popover: {
            title: 'Data Drilldown',
            description: 'Click on specific alarm metrics or rows to open detailed drilldown modals for a deeper investigation of site alarms.',
            side: 'left',
            align: 'center'
          }
        },
        {
          element: '#tour-sa-tab-analytics',
          onHighlightStarted: () => switchTab('analytics'),
          popover: {
            title: 'Analytics Dashboard',
            description: 'Switch to Analytics to view graphical breakdowns of alert severities, alarm types, and affected regions.',
            side: 'right',
            align: 'start'
          }
        },
        {
          element: '#tour-sa-time-trends',
          onHighlightStarted: () => switchTab('analytics'),
          popover: {
            title: 'Time Trends',
            description: 'Track alarm volume by hour to spot concentration windows.',
            side: 'right',
            align: 'start'
          }
        },
        {
          element: '#tour-sa-top-alarms',
          onHighlightStarted: () => switchTab('analytics'),
          popover: {
            title: 'Top Alarms',
            description: 'See the most frequent alarm groups and their relative impact.',
            side: 'right',
            align: 'start'
          }
        },
        {
          element: '#tour-sa-analytics-expand',
          onHighlightStarted: () => switchTab('analytics'),
          popover: {
            title: 'Expand Analytics',
            description: 'Click Expand to open the full analytics modal view.',
            side: 'left',
            align: 'center'
          }
        },
        {
          element: '#tour-sa-history-tab',
          onHighlightStarted: () => switchTab('history'),
          popover: {
            title: 'History Panel',
            description: 'Access the global database of previously processed network scans.',
            side: 'right',
            align: 'start'
          }
        },
        {
          element: '#tour-sa-last-modified',
          onHighlightStarted: () => {
             switchTab('history');
             void closeMenusExcept();
          },
          popover: {
            title: 'Database Tracking',
            description: 'See exactly who last updated the alarm database and what file they used.',
            side: 'right',
            align: 'start'
          }
        },
        {
          element: '#tour-sa-history-list',
          onHighlightStarted: () => prepareTarget('#tour-sa-history-list', () => switchTab('history')),
          popover: {
            title: 'Instant Reloading',
            description: 'Click any historical log to immediately fetch and reload it into your active table without rescanning.',
            side: 'right',
            align: 'start'
          }
        },
        {
          element: '#tour-export-wrap',
          onHighlightStarted: () => prepareTarget('#tour-export-wrap', openExportMenu),
          popover: {
            title: 'Export Intelligence',
            description: 'Generate an Excel report of the parsed alarms, complete with their assigned severity classifications.',
            side: 'bottom',
            align: 'end'
          }
        },
        {
          element: '#tour-notif-wrap',
          onHighlightStarted: () => prepareTarget('#tour-notif-wrap', openNotificationMenu),
          popover: {
            title: 'Notifications',
            description: 'Receive real-time alerts when other engineers upload new datasets to the global database.',
            side: 'bottom',
            align: 'end'
          }
        },
        {
          element: '#tour-profile-wrap',
          onHighlightStarted: () => prepareTarget('#tour-profile-wrap', openProfileDropdown),
          popover: {
            title: 'Your Workspace Menu',
            description: 'Manage your profile, monitor connection latency, and access visual preferences.',
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
      if (driverRef.current?.isActive()) return;
      const started = Date.now();
      while (window.__SA_TOUR_WAIT_FOR_DATA__ === true && Date.now() - started < 5000) {
        await new Promise((resolve) => setTimeout(resolve, 120));
      }
      if (typeof setActiveTab === 'function') {
        setActiveTab('input');
        await new Promise((resolve) => setTimeout(resolve, 180));
      }
      if (!driverRef.current) driverRef.current = buildDriver();
      driverRef.current.drive();
    };
    void start();
  }, [buildDriver, setActiveTab]);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await postTourAction({ action: 'getTourStatus', authContext });
        // Note: Assuming 'saTourCompleted' is available, otherwise this will gracefully fall back.
        const completed = res?.data?.saTourCompleted === true; 
        setTourCompleted(completed);
        setTourEligible(!completed);
      } catch (error) {
        console.error('Failed to fetch SA tour status:', error);
      }
    };
    checkStatus();
  }, [authContext]);

  useEffect(() => {
    if (!tourEligible || tourCompleted) return;
    if (driverRef.current?.isActive()) return;
    const timer = setTimeout(() => {
      startTour();
    }, 500);
    return () => clearTimeout(timer);
  }, [tourCompleted, tourEligible, startTour]);

  return { startTour };
};
