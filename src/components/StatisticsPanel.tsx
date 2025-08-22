import React from 'react';
import { Users, MapPin, Calendar, Shield, Building, Globe, Heart, UserCheck, Clock, FileText, Phone, Mail, GitCommit } from 'lucide-react';
import { Person } from '../services/apiService';

interface StatisticsPanelProps {
  applicants: Person[];
  referees: Person[];
  associates: Person[];
}

const StatisticsPanel: React.FC<StatisticsPanelProps> = ({ applicants, referees, associates }) => {
  // Calculate statistics
  const totalPeople = applicants.length + referees.length + associates.length;
  
  // Local state for push button
  const [isPushing, setIsPushing] = React.useState(false);
  
  // Only show push button on localhost/lan or when running in dev
  const isLocalhostEnv = typeof window !== 'undefined' && (
    ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname) ||
    window.location.hostname.startsWith('192.168.') ||
    window.location.hostname.startsWith('10.')
  );
  const showPushButton = isLocalhostEnv || import.meta.env.DEV;

  const handlePushToWeb = async () => {
    setIsPushing(true);
    try {
      const isDev = import.meta.env.DEV;
      const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      const message = `Update via UI - ${new Date().toISOString()}`;
      // Prefer VITE_TRIGGER_IMAGE_UPDATE_URL or VITE_NETLIFY_BUILD_HOOK; also support a second hook via VITE_NETLIFY_BUILD_HOOK_2
      const hookPrimary = (
        (import.meta as any).env?.VITE_TRIGGER_IMAGE_UPDATE_URL ||
        (import.meta as any).env?.VITE_NETLIFY_BUILD_HOOK
      ) as string | undefined;
      const hookSecondary = (import.meta as any).env?.VITE_NETLIFY_BUILD_HOOK_2 as string | undefined;
      const buildHooks = [hookPrimary, hookSecondary].filter(Boolean) as string[];

      // In production, require at least one configured build hook; in dev/local we can fall back to local git endpoint
      if (buildHooks.length === 0 && !(isDev || isLocalhost)) {
        alert('No build hook configured. Please set VITE_NETLIFY_BUILD_HOOK (and optionally VITE_NETLIFY_BUILD_HOOK_2) in your Netlify site env vars.');
        setIsPushing(false);
        return;
      }

      if (buildHooks.length > 0) {
        // Trigger all configured build hooks (in parallel) so multiple Netlify sites can rebuild
        const results = await Promise.allSettled(
          buildHooks.map((url) =>
            fetch(url, { method: 'POST' })
          )
        );
        const successCount = results.reduce((acc, r) => acc + (r.status === 'fulfilled' && (r as any).value?.ok ? 1 : 0), 0);
        if (successCount > 0) {
          alert(`Build triggered via ${successCount} Netlify build hook${successCount > 1 ? 's' : ''}. Netlify will run the build(s), download fresh images during build, and deploy the site(s).`);
        } else {
          // Try to surface one error
          const firstRejection = results.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
          throw new Error(firstRejection?.reason?.message || 'Failed to trigger Netlify build hook(s)');
        }
      } else {
        // Dev/local fallback: commit locally via Vite middleware endpoint
        const response = await fetch('/dev/git-commit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error((data as any)?.error || 'Failed to commit locally');
        }
        alert((data as any)?.message || 'Committed changes locally. If a remote is configured, they have been pushed.');
      }
      // Builds were already triggered above (Netlify build hook(s) or local commit); no further action is required here.
    } catch (e: any) {
      console.error('Push to web failed:', e);
      alert(`Could not push images to the web. ${e?.message || e}`);
    } finally {
      setIsPushing(false);
    }
  };
  
  // Marital Status Distribution
  const maritalStatusCounts = applicants.reduce((acc, person) => {
    const status = person.maritalStatus || 'Not Specified';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // State of Origin Distribution
  const stateOriginCounts = applicants.reduce((acc, person) => {
    const state = person.stateOfOrigin || 'Not Specified';
    acc[state] = (acc[state] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Nationality Distribution
  const nationalityCounts = applicants.reduce((acc, person) => {
    const nationality = person.nationality || 'Not Specified';
    acc[nationality] = (acc[nationality] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Criminal Record Statistics
  const criminalRecordCounts = applicants.reduce((acc, person) => {
    const record = person.criminalRecord || 'Not Specified';
    acc[record] = (acc[record] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Age Distribution (approximate from date of birth)
  const ageGroups = applicants.reduce((acc, person) => {
    if (person.dateOfBirth) {
      try {
        const birthDate = new Date(person.dateOfBirth);
        const age = new Date().getFullYear() - birthDate.getFullYear();
        let ageGroup = 'Unknown';
        if (age < 25) ageGroup = '18-24';
        else if (age < 35) ageGroup = '25-34';
        else if (age < 45) ageGroup = '35-44';
        else if (age < 55) ageGroup = '45-54';
        else ageGroup = '55+';
        acc[ageGroup] = (acc[ageGroup] || 0) + 1;
      } catch {
        acc['Unknown'] = (acc['Unknown'] || 0) + 1;
      }
    } else {
      acc['Unknown'] = (acc['Unknown'] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Recent submissions (last 30 days)
  const recentSubmissions = applicants.filter(person => {
    if (!person.timestamp) return false;
    const submissionDate = new Date(person.timestamp);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return submissionDate >= thirtyDaysAgo;
  }).length;

  // Contact Information Completeness
  const contactCompleteness = {
    withEmail: applicants.filter(p => p.email && typeof p.email === 'string' && p.email.trim() !== '').length,
    withPhone: applicants.filter(p => p.phoneNumbers && typeof p.phoneNumbers === 'string' && p.phoneNumbers.trim() !== '').length,
    withAddress: applicants.filter(p => p.residentialAddress && typeof p.residentialAddress === 'string' && p.residentialAddress.trim() !== '').length,
    withSocialMedia: applicants.filter(p => p.socialMediaHandles && typeof p.socialMediaHandles === 'string' && p.socialMediaHandles.trim() !== '').length,
  };

  // Application Completeness Score
  const getCompletenessScore = (person: Person) => {
    const fields = [
      person.firstName, person.surname, person.email, person.phoneNumbers,
      person.residentialAddress, person.stateOfOrigin, person.localGovernmentArea,
      person.dateOfBirth, person.maritalStatus, person.nationality
    ];
    const filledFields = fields.filter(field => field && typeof field === 'string' && field.trim() !== '').length;
    return Math.round((filledFields / fields.length) * 100);
  };

  const averageCompleteness = applicants.length > 0 
    ? Math.round(applicants.reduce((sum, person) => sum + getCompletenessScore(person), 0) / applicants.length)
    : 0;

  // Koinonia Following Duration Distribution
  const koinoniaFollowingCounts = applicants.reduce((acc, person) => {
    const duration = person.koinoniaFollowingDuration || 'Not Specified';
    acc[duration] = (acc[duration] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Location Distribution
  const locationCounts = applicants.reduce((acc, person) => {
    const location = person.residentialAddress || 'Not Specified';
    acc[location] = (acc[location] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const StatCard: React.FC<{ icon: any; title: string; value: number | string; subtitle?: string; color?: string; }> = ({ icon: Icon, title, value, subtitle, color = 'blue' }) => (
    <div className={`bg-white rounded-xl shadow-sm p-4 border border-gray-100`}>
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-lg bg-${color}-100 text-${color}-600`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-700">{title}</h3>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
      </div>
    </div>
  );

  const renderDistribution = (title: string, data: Record<string, number>, Icon: any) => (
    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-2 rounded-lg bg-gray-100 text-gray-600">
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-medium text-gray-700">{title}</h3>
      </div>
      <div className="space-y-3">
        {Object.entries(data)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([key, value]) => (
            <div key={key} className="flex justify-between items-center">
              <span className="text-sm text-gray-600 truncate">{key}</span>
              <div className="flex items-center space-x-2">
                <div className="w-16 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-orange-600 h-2 rounded-full"
                    style={{ width: `${(value / Math.max(...Object.values(data))) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900 w-8 text-right">{value}</span>
              </div>
            </div>
          ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header actions row for push button */}
      <div className="flex items-center justify-end">
        {showPushButton && (
          <button
            onClick={handlePushToWeb}
            disabled={isPushing}
            className="hidden sm:inline-flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium transition-colors shadow-sm"
            title="Trigger Netlify build (uses build hook in production, local git in dev)"
          >
            <GitCommit className="w-4 h-4" />
            <span>{isPushing ? 'Pushing…' : 'Push to web'}</span>
          </button>
        )}
      </div>

      {/* Overview Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Users}
          title="Total People"
          value={totalPeople}
          subtitle="All records"
          color="blue"
        />
        <StatCard
          icon={UserCheck}
          title="Applicants"
          value={applicants.length}
          subtitle="Main applications"
          color="green"
        />
        <StatCard
          icon={Shield}
          title="Referees"
          value={referees.length}
          subtitle="Reference providers"
          color="purple"
        />
        <StatCard
          icon={Building}
          title="Associates"
          value={associates.length}
          subtitle="Associated contacts"
          color="orange"
        />
      </div>

      {/* Recent Activity & Completeness */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Calendar}
          title="Recent Submissions"
          value={recentSubmissions}
          subtitle="Last 30 days"
          color="indigo"
        />
        <StatCard
          icon={Shield}
          title="Clean Records"
          value={criminalRecordCounts['No'] || 0}
          subtitle="No criminal record"
          color="green"
        />
        <StatCard
          icon={MapPin}
          title="Top Locations"
          value={Object.keys(locationCounts).length}
          subtitle="Unique places"
          color="pink"
        />
      </div>

      {/* Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderDistribution('Marital Status Distribution', maritalStatusCounts, Heart)}
        {renderDistribution('Nationality Distribution', nationalityCounts, Globe)}
        {renderDistribution('State of Origin Distribution', stateOriginCounts, MapPin)}
        {renderDistribution('Koinonia Following Duration', koinoniaFollowingCounts, Clock)}
      </div>

      {/* Contact Information Completeness */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 rounded-lg bg-gray-100 text-gray-600">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-medium text-gray-700">Contact Information Completeness</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">With Email</p>
            <p className="text-lg font-semibold text-gray-900">{contactCompleteness.withEmail}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">With Phone</p>
            <p className="text-lg font-semibold text-gray-900">{contactCompleteness.withPhone}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">With Address</p>
            <p className="text-lg font-semibold text-gray-900">{contactCompleteness.withAddress}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">With Social Media</p>
            <p className="text-lg font-semibold text-gray-900">{contactCompleteness.withSocialMedia}</p>
          </div>
        </div>
      </div>

      {/* Contact Icons Legend */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 rounded-lg bg-gray-100 text-gray-600">
            <Phone className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-medium text-gray-700">Contact Channels</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-gray-600 text-sm">
          <div className="flex items-center space-x-2"><Mail className="w-4 h-4" /> <span>Email</span></div>
          <div className="flex items-center space-x-2"><Phone className="w-4 h-4" /> <span>Phone</span></div>
          <div className="flex items-center space-x-2"><Globe className="w-4 h-4" /> <span>Social Media</span></div>
          <div className="flex items-center space-x-2"><MapPin className="w-4 h-4" /> <span>Address</span></div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsPanel;