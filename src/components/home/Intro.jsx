import { createRoot } from 'react-dom/client';
import '../../content.css';

function getStudentName() {
  const el =
    document.querySelector('.navbar-text .navbar-link small') ||
    document.querySelector('.navbar-text .navbar-link');
  if (!el) return '';
  const raw = el.textContent.trim();
  const parts = raw.split(',').map((s) => s.trim());
  const tc = (s) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  if (parts.length >= 2) return tc(parts[1]) + ' ' + tc(parts[0]);
  return tc(raw);
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function IntroHeader({ name }) {
  const firstName = name.split(' ')[0] || 'Student';
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="mb-4 pb-3 border-b-2 border-slate-100">
      <h2 className="text-[22px] font-bold text-slate-900 mb-1 leading-tight">
        {getGreeting()},{' '}
        <span className="text-blue-600">{firstName}</span>!
      </h2>
      <p className="text-[13px] text-slate-500">{dateStr}</p>
    </div>
  );
}

function TeamsInfoSection() {
  return (
    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
      <b className="block text-green-800 mb-3 text-xl font-bold">
        Please use this below information for log in to Microsoft Teams.
      </b>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <table className="w-full border border-gray-400 text-lg">
            <tbody>
              <tr>
                <td className="border border-gray-400 p-3 font-bold text-lg">User Name</td>
                <td className="border border-gray-400 p-3 font-bold w-1 text-lg">:</td>
                <td className="border border-gray-400 p-3 font-bold text-lg">23-53347-3@student.aiub.edu</td>
              </tr>
              <tr>
                <td className="border border-gray-400 p-3 font-bold text-lg">Password</td>
                <td className="border border-gray-400 p-3 font-bold w-1 text-lg">:</td>
                <td className="border border-gray-400 p-3 font-bold text-lg">Muj89123</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="border border-gray-300 rounded p-3">
          <b className="block mb-2 text-gray-800 text-lg font-bold">How to log in to Microsoft Teams with one time password.</b>
          <a 
            href="/Content/OfficialForms/Student/MicrosoftTeams.pdf" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-block px-5 py-3 bg-blue-600 text-white rounded text-lg font-bold hover:bg-blue-700"
          >
            Download
          </a>
        </div>
      </div>
    </div>
  );
}

function GeneralInfoAlert() {
  return (
    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-gray-800">
      <b className="text-lg font-bold">
        Please provide your general information Correctly through{' '}
        <a 
          href="/Student/Application/Host?q=DA378AHT2kccklCDtkunW1fEAYt8iUZ4" 
          className="underline text-blue-600 hover:text-blue-800"
        >
          General Information Change Application
        </a>
        .
      </b>
    </div>
  );
}

function ActionButtonsSection() {
  const buttons = [
    { text: 'Go to Registration', href: '/Student/Registration/Start', style: 'bg-red-600 hover:bg-red-700' },
    { text: 'Submit Identity Information', href: '/Student/StudentIdentity/LoadView?Length=7', style: 'bg-cyan-500 hover:bg-cyan-600' },
    { text: 'Covid-19 Vaccine Information', href: '/Student/Home/CovidVaccineInformation', style: 'bg-cyan-500 hover:bg-cyan-600' },
  ];

  return (
    <div className="mb-4 border border-gray-300 rounded">
      <div className="p-4">
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          {buttons.map((btn, idx) => (
            <a
              key={idx}
              href={btn.href}
              className={`px-6 py-3 text-white rounded text-lg font-bold ${btn.style} inline-block text-center`}
            >
              {btn.text}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function hideOriginalSections() {
  // Hide the original alerts and panels on the page - but only in the main content area
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  // Hide alerts in main content
  mainContent.querySelectorAll('.alert.alert-success, .alert.alert-warning').forEach(alert => {
    alert.style.display = 'none';
  });
  
  // Hide panels in main content - exclude navigation sidebar panels
  const contentWrap =
    mainContent.querySelector('.row > .col-sm-12') ||
    mainContent.querySelector('.row > .col-xs-12') ||
    mainContent.querySelector('.row > [class*="col-"]');
  
  if (contentWrap) {
    contentWrap.querySelectorAll('.panel.panel-default').forEach(panel => {
      panel.style.display = 'none';
    });
  }
}

(function mount() {
  if (window.__aiubIntroMounted) return;

  chrome.storage.sync.get({ extensionEnabled: true }, (r) => {
    if (!r.extensionEnabled) return;

    function tryMount() {
      const mainContent = document.getElementById('main-content');
      if (!mainContent) { setTimeout(tryMount, 200); return; }
      if (window.__aiubIntroMounted) return;
      window.__aiubIntroMounted = true;

      // Hide original page sections before inserting our content
      hideOriginalSections();

      const contentWrap =
        mainContent.querySelector('.row > .col-sm-12') ||
        mainContent.querySelector('.row > .col-xs-12') ||
        mainContent.querySelector('.row > [class*="col-"]');
      if (!contentWrap) return;

      const container = document.createElement('div');
      container.id = 'aiub-intro-root';
      contentWrap.insertBefore(container, contentWrap.firstChild);
      createRoot(container).render(
        <>
          <TeamsInfoSection />
          <GeneralInfoAlert />
          <ActionButtonsSection />
        </>
      );
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', tryMount);
    } else {
      tryMount();
    }
  });
})();
