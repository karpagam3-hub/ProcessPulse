import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  GitCompare,
  AlertTriangle,
  BarChart3,
  TrendingDown,
  BrainCircuit,
  UserCheck,
  Database,
  FileCheck2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Cpu,
  Clock,
  Layers,
  Sparkles,
  ArrowRight,
  Filter,
  Check,
  AlertCircle,
  ChevronRight,
  Search,
  ShieldAlert,
  Info,
  Send,
  History,
  ThumbsUp,
  HelpCircle,
  XOctagon,
  FileText
} from 'lucide-react';
import {
  getHealth,
  getSOP,
  getExecutions,
  getSummaryMetrics,
  getMachineAnalysis,
  getShiftAnalysis,
  getDeviations,
  getPatternAnalysis,
  getImpactAnalysis,
  requestInvestigation,
  getPendingValidations,
  submitValidation,
  getValidationHistory,
  getMemoryMatch
} from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [backendHealth, setBackendHealth] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(true);

  // Phase 2 Data States
  const [sop, setSop] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [executions, setExecutions] = useState([]);
  const [deviations, setDeviations] = useState([]);
  const [machineData, setMachineData] = useState([]);
  const [shiftData, setShiftData] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState(null);

  // Process Mirror Selection State
  const [selectedExecId, setSelectedExecId] = useState('EXEC-001');

  // Deviation Analysis Filter States
  const [mchFilter, setMchFilter] = useState('ALL');
  const [shiftFilter, setShiftFilter] = useState('ALL');

  // Phase 3 Data States
  const [patternData, setPatternData] = useState(null);
  const [impactData, setImpactData] = useState(null);
  const [pendingValidations, setPendingValidations] = useState([]);
  const [validationHistory, setValidationHistory] = useState([]);

  // AI Investigation State
  const [investigationExecId, setInvestigationExecId] = useState('EXEC-002');
  const [investigationResult, setInvestigationResult] = useState(null);
  const [investigationLoading, setInvestigationLoading] = useState(false);
  const [investigationMatch, setInvestigationMatch] = useState(null);

  // Human Validation Form State
  const [validationTargetId, setValidationTargetId] = useState('EXEC-002');
  const [selectedDecision, setSelectedDecision] = useState('Validate Improvement');
  const [reviewerName, setReviewerName] = useState('Senior Operations Lead (Simulated)');
  const [justificationReason, setJustificationReason] = useState(
    'Workaround effectively stabilizes optical alignment without introducing wire stress.'
  );
  const [validationSubmitting, setValidationSubmitting] = useState(false);
  const [validationFeedback, setValidationFeedback] = useState(null);

  // Process Memory Filter State
  const [memoryFilter, setMemoryFilter] = useState('ALL');
  const [memorySearch, setMemorySearch] = useState('');

  // Initial Data Load
  const fetchAllData = async () => {
    setLoadingHealth(true);
    setLoadingData(true);
    setDataError(null);

    try {
      const healthRes = await getHealth();
      setBackendHealth(healthRes);

      const [
        sopRes,
        metricsRes,
        execsRes,
        devsRes,
        mchRes,
        shiftRes,
        patternRes,
        impactRes,
        pendingRes,
        historyRes,
      ] = await Promise.all([
        getSOP(),
        getSummaryMetrics(),
        getExecutions(),
        getDeviations(),
        getMachineAnalysis(),
        getShiftAnalysis(),
        getPatternAnalysis(),
        getImpactAnalysis(),
        getPendingValidations(),
        getValidationHistory(),
      ]);

      setSop(sopRes);
      setMetrics(metricsRes);
      setExecutions(execsRes);
      setDeviations(devsRes);
      setMachineData(mchRes);
      setShiftData(shiftRes);
      setPatternData(patternRes);
      setImpactData(impactRes);
      setPendingValidations(pendingRes);
      setValidationHistory(historyRes);

      // Trigger default investigation for EXEC-002
      loadInvestigation('EXEC-002');
    } catch (err) {
      console.error('Failed to load ProcessPulse data:', err);
      setDataError(err.message || 'Unable to communicate with ProcessPulse API');
      setBackendHealth(null);
    } finally {
      setLoadingHealth(false);
      setLoadingData(false);
    }
  };

  const loadInvestigation = async (execId) => {
    setInvestigationLoading(true);
    try {
      const [invRes, matchRes] = await Promise.all([
        requestInvestigation(execId),
        getMemoryMatch(execId),
      ]);
      setInvestigationResult(invRes);
      setInvestigationMatch(matchRes);
    } catch (err) {
      console.error('Investigation error:', err);
    } finally {
      setInvestigationLoading(false);
    }
  };

  const handleValidationSubmit = async (e) => {
    e.preventDefault();
    if (!justificationReason || justificationReason.trim().length < 5) {
      setValidationFeedback({
        type: 'error',
        message: 'A clear justification of at least 5 characters is required.',
      });
      return;
    }

    setValidationSubmitting(true);
    setValidationFeedback(null);
    try {
      const savedRecord = await submitValidation({
        execution_id: validationTargetId,
        decision: selectedDecision,
        reviewer: reviewerName,
        reason: justificationReason,
      });

      setValidationFeedback({
        type: 'success',
        message: `Decision successfully persisted to SQLite! Decision ID: ${savedRecord.decision_id}`,
      });

      // Refresh history and pending
      const updatedHistory = await getValidationHistory();
      setValidationHistory(updatedHistory);

      // If this matches current investigation, refresh its match
      if (investigationExecId === validationTargetId) {
        const updatedMatch = await getMemoryMatch(validationTargetId);
        setInvestigationMatch(updatedMatch);
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to submit decision';
      setValidationFeedback({ type: 'error', message: msg });
    } finally {
      setValidationSubmitting(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const navItems = [
    { id: 'overview', label: '1. Factory Overview', icon: LayoutDashboard },
    { id: 'mirror', label: '2. Process Mirror', icon: GitCompare },
    { id: 'deviation', label: '3. Deviation Analysis', icon: AlertTriangle },
    { id: 'pattern', label: '4. Pattern Analysis', icon: BarChart3 },
    { id: 'impact', label: '5. Impact Analysis', icon: TrendingDown },
    { id: 'investigation', label: '6. AI Investigation', icon: BrainCircuit },
    { id: 'validation', label: '7. Human Validation', icon: UserCheck },
    { id: 'memory', label: '8. Process Memory', icon: Database },
    { id: 'sop_review', label: '9. SOP Review Opportunities', icon: FileCheck2 },
  ];

  const currentExecution = executions.find((e) => e.execution_id === selectedExecId) || executions[0];

  const filteredDeviations = deviations.filter((dev) => {
    if (mchFilter !== 'ALL' && dev.machine_id !== mchFilter) return false;
    if (shiftFilter !== 'ALL' && dev.shift !== shiftFilter) return false;
    return true;
  });

  const filteredHistory = validationHistory.filter((item) => {
    if (memoryFilter !== 'ALL' && item.decision !== memoryFilter) return false;
    if (memorySearch.trim() !== '') {
      const q = memorySearch.toLowerCase();
      return (
        item.execution_id.toLowerCase().includes(q) ||
        item.machine_id.toLowerCase().includes(q) ||
        item.deviation_signature.toLowerCase().includes(q) ||
        item.reason.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="app-container">
      {/* Persistent Sidebar */}
      <aside className="app-sidebar">
        <div className="sidebar-header">
          <div className="logo-badge">P</div>
          <div className="brand-text">
            <h1>ProcessPulse</h1>
            <span>Intelligence & SOP Engine</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`nav-item ${isActive ? 'active' : ''}`}
                style={{ width: '100%', background: 'none', textAlign: 'left', border: 'none' }}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="system-status">
            <span className={`status-dot ${backendHealth ? '' : 'offline'}`}></span>
            <span>
              {loadingHealth
                ? 'Connecting backend...'
                : backendHealth
                ? `Backend: ${backendHealth.status.toUpperCase()}`
                : 'Backend: OFFLINE'}
            </span>
          </div>
          <span style={{ fontSize: '11px', opacity: 0.7 }}>
            API: http://127.0.0.1:8001
          </span>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="app-main">
        <header className="main-header">
          <div className="header-title-section">
            <h2>ProcessPulse Intelligence System</h2>
            <p>Smart Manufacturing Process Intelligence & Improvement Framework</p>
          </div>
          <div className="header-actions">
            <span className="simulation-banner">
              Simulated Manufacturing Data
            </span>
            <button
              onClick={fetchAllData}
              disabled={loadingData}
              className="btn btn-secondary"
              title="Refresh dataset from backend"
            >
              <RefreshCw size={14} className={loadingData ? 'animate-spin' : ''} />
              <span>Refresh API</span>
            </button>
            <div className="badge badge-info">
              <Cpu size={13} />
              <span>Phase 3 Active</span>
            </div>
          </div>
        </header>

        <div className="main-content">
          {/* Global Connection / Data Error Banner */}
          {dataError && (
            <div className="card" style={{ borderColor: 'var(--status-danger-border)', backgroundColor: 'var(--status-danger-bg)', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--status-danger-text)' }}>
                <AlertCircle size={20} />
                <div>
                  <strong>API Connection Warning:</strong> {dataError}. Ensure backend is running on port 8001.
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              MODULE 1: FACTORY OVERVIEW
              ========================================================================= */}
          {activeTab === 'overview' && (
            <div>
              {/* Primary Metric KPI Cards */}
              <div className="grid-cols-4" style={{ marginBottom: '24px' }}>
                <div className="metric-card">
                  <div className="metric-header">
                    <span>Total Executions</span>
                    <Layers size={16} color="var(--accent-teal)" />
                  </div>
                  <div className="metric-value">{metrics ? metrics.total_executions : '--'}</div>
                  <div className="metric-sub">Simulation batch (Seed: 42)</div>
                </div>

                <div className="metric-card">
                  <div className="metric-header">
                    <span>Normal Executions</span>
                    <CheckCircle2 size={16} color="#22c55e" />
                  </div>
                  <div className="metric-value" style={{ color: '#1b6334' }}>
                    {metrics ? metrics.normal_executions : '--'}
                  </div>
                  <div className="metric-sub">
                    {metrics ? `${((metrics.normal_executions / metrics.total_executions) * 100).toFixed(1)}% strict SOP adherence` : '--'}
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-header">
                    <span>Deviated Executions</span>
                    <AlertTriangle size={16} color="var(--accent-terracotta)" />
                  </div>
                  <div className="metric-value" style={{ color: 'var(--accent-terracotta)' }}>
                    {metrics ? metrics.deviated_executions : '--'}
                  </div>
                  <div className="metric-sub">
                    {metrics ? `${metrics.deviated_executions} executions with variations` : '--'}
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-header">
                    <span>Deviation Rate</span>
                    <TrendingDown size={16} color="var(--accent-terracotta)" />
                  </div>
                  <div className="metric-value">
                    {metrics ? `${metrics.deviation_rate}%` : '--'}
                  </div>
                  <div className="metric-sub">Calculated from actual logs</div>
                </div>
              </div>

              {/* Secondary KPIs */}
              <div className="grid-cols-4" style={{ marginBottom: '24px' }}>
                <div className="metric-card">
                  <div className="metric-header">
                    <span>Avg Cycle Time</span>
                    <Clock size={16} color="var(--text-secondary)" />
                  </div>
                  <div className="metric-value">{metrics ? `${metrics.avg_cycle_time_seconds}s` : '--'}</div>
                  <div className="metric-sub">Nominal standard: 300s</div>
                </div>

                <div className="metric-card">
                  <div className="metric-header">
                    <span>Missing Step Events</span>
                    <AlertTriangle size={16} color="#ef4444" />
                  </div>
                  <div className="metric-value">{metrics ? metrics.missing_step_occurrences : '--'}</div>
                  <div className="metric-sub">Skipped SOP requirements</div>
                </div>

                <div className="metric-card">
                  <div className="metric-header">
                    <span>Additional Step Events</span>
                    <Sparkles size={16} color="var(--accent-terracotta)" />
                  </div>
                  <div className="metric-value">{metrics ? metrics.additional_step_occurrences : '--'}</div>
                  <div className="metric-sub">Worker additions & workarounds</div>
                </div>

                <div className="metric-card">
                  <div className="metric-header">
                    <span>Sequence Issues</span>
                    <GitCompare size={16} color="#8b5cf6" />
                  </div>
                  <div className="metric-value">{metrics ? metrics.sequence_issue_occurrences : '--'}</div>
                  <div className="metric-sub">Out-of-order execution</div>
                </div>
              </div>

              {/* Machine & Shift Tables */}
              <div className="grid-cols-2" style={{ marginBottom: '24px' }}>
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Machine Deviation Analysis</h3>
                    <span className="badge badge-info">Real API Breakdown</span>
                  </div>
                  <div className="table-container">
                    <table className="styled-table">
                      <thead>
                        <tr>
                          <th>Machine</th>
                          <th>Total</th>
                          <th>Normal</th>
                          <th>Deviated</th>
                          <th>Dev Rate</th>
                          <th>Defect Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {machineData.map((m) => (
                          <tr key={m.machine_id}>
                            <td><strong>{m.machine_id}</strong></td>
                            <td>{m.total_executions}</td>
                            <td>{m.normal_executions}</td>
                            <td>{m.deviated_executions}</td>
                            <td>
                              <span className="badge badge-warning">{m.deviation_rate}%</span>
                            </td>
                            <td>{m.defect_rate}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Shift Performance Analysis</h3>
                    <span className="badge badge-info">3 Operating Shifts</span>
                  </div>
                  <div className="table-container">
                    <table className="styled-table">
                      <thead>
                        <tr>
                          <th>Shift</th>
                          <th>Total</th>
                          <th>Normal</th>
                          <th>Deviated</th>
                          <th>Dev Rate</th>
                          <th>Defect Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shiftData.map((s) => (
                          <tr key={s.shift}>
                            <td><strong>{s.shift}</strong></td>
                            <td>{s.total_executions}</td>
                            <td>{s.normal_executions}</td>
                            <td>{s.deviated_executions}</td>
                            <td>
                              <span className="badge badge-warning">{s.deviation_rate}%</span>
                            </td>
                            <td>{s.defect_rate}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Quick Navigation Banner */}
              <div className="card" style={{ background: 'var(--bg-surface-subtle)', borderStyle: 'dashed' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px' }}>Ready to analyze statistical clusters?</h4>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      Examine recurring variation patterns across machines and shifts in Module 4: Pattern Analysis.
                    </p>
                  </div>
                  <button onClick={() => setActiveTab('pattern')} className="btn btn-primary">
                    <span>Explore Pattern Analysis</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              MODULE 2: PROCESS MIRROR
              ========================================================================= */}
          {activeTab === 'mirror' && (
            <div>
              <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header">
                  <div>
                    <h3 className="card-title">Select Execution Run to Mirror</h3>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                      Compare the official Standard Operating Procedure against actual recorded shop-floor events.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setSelectedExecId('EXEC-001')}
                      className={`filter-btn ${selectedExecId === 'EXEC-001' ? 'active' : ''}`}
                    >
                      Demo 1: Normal (EXEC-001)
                    </button>
                    <button
                      onClick={() => setSelectedExecId('EXEC-002')}
                      className={`filter-btn ${selectedExecId === 'EXEC-002' ? 'active' : ''}`}
                    >
                      Demo 2: Added Step (EXEC-002)
                    </button>
                    <button
                      onClick={() => setSelectedExecId('EXEC-003')}
                      className={`filter-btn ${selectedExecId === 'EXEC-003' ? 'active' : ''}`}
                    >
                      Demo 3: Missing Step (EXEC-003)
                    </button>
                    <button
                      onClick={() => setSelectedExecId('EXEC-004')}
                      className={`filter-btn ${selectedExecId === 'EXEC-004' ? 'active' : ''}`}
                    >
                      Demo 4: Sequence Issue (EXEC-004)
                    </button>
                    <button
                      onClick={() => setSelectedExecId('EXEC-005')}
                      className={`filter-btn ${selectedExecId === 'EXEC-005' ? 'active' : ''}`}
                    >
                      Demo 5: Multi-Deviation (EXEC-005)
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                    Or select any execution:
                  </label>
                  <select
                    value={selectedExecId}
                    onChange={(e) => setSelectedExecId(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-medium)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '13px',
                      backgroundColor: 'var(--bg-surface)',
                    }}
                  >
                    {executions.map((e) => (
                      <option key={e.execution_id} value={e.execution_id}>
                        {e.execution_id} — {e.machine_id} ({e.shift}) {e.deviation_info?.has_deviation ? '⚠️ Deviated' : '✓ Normal'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {currentExecution && (
                <div className="card" style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <span className="code-tag" style={{ fontSize: '15px', fontWeight: '700' }}>
                          {currentExecution.execution_id}
                        </span>
                        {currentExecution.deviation_info?.has_deviation ? (
                          <span className="badge badge-warning">
                            <AlertTriangle size={13} /> Process Deviation Detected
                          </span>
                        ) : (
                          <span className="badge badge-normal">
                            <CheckCircle2 size={13} /> Strict SOP Adherence
                          </span>
                        )}
                        <span className="badge badge-info">
                          {currentExecution.data_source}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        <strong>Product:</strong> {currentExecution.product_name} ({currentExecution.product_id}) | 
                        <strong> Machine:</strong> {currentExecution.machine_id} | 
                        <strong> Shift:</strong> {currentExecution.shift} | 
                        <strong> Cycle Time:</strong> {currentExecution.cycle_time_seconds}s
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block' }}>Defect Status</span>
                        {currentExecution.defect_detected ? (
                          <span className="badge badge-danger">Defect Detected</span>
                        ) : (
                          <span className="badge badge-normal">Zero Defects</span>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block' }}>Rework Status</span>
                        {currentExecution.rework_required ? (
                          <span className="badge badge-warning">Rework Required</span>
                        ) : (
                          <span className="badge badge-normal">No Rework</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: '16px',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: currentExecution.deviation_info?.has_deviation ? 'var(--status-warning-bg)' : 'var(--status-normal-bg)',
                      border: `1px solid ${currentExecution.deviation_info?.has_deviation ? 'var(--status-warning-border)' : 'var(--status-normal-border)'}`,
                      fontSize: '13px',
                      color: currentExecution.deviation_info?.has_deviation ? 'var(--status-warning-text)' : 'var(--status-normal-text)',
                    }}
                  >
                    <strong>Deterministic Engine Assessment: </strong>
                    {currentExecution.deviation_info?.explanation}
                  </div>
                </div>
              )}

              {currentExecution && (
                <div className="mirror-grid">
                  <div className="card">
                    <div className="card-header">
                      <div>
                        <h4 className="card-title">Official Standard Operating Procedure</h4>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {sop ? `${sop.sop_name} (${sop.version})` : 'SOP Definition'}
                        </span>
                      </div>
                      <span className="badge badge-info">Documented SOP</span>
                    </div>

                    <div>
                      {sop?.step_details.map((step) => {
                        const isMissingInActual = currentExecution.deviation_info?.missing_steps.includes(step.step_name);
                        return (
                          <div
                            key={step.step_number}
                            className={`step-card ${isMissingInActual ? 'missing' : 'matched'}`}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="code-tag">{step.step_number}</span>
                                <strong>{step.step_name}</strong>
                              </div>
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                {step.description}
                              </span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>
                                {step.standard_duration_seconds}s
                              </span>
                              {isMissingInActual ? (
                                <span className="badge badge-danger">SKIPPED</span>
                              ) : (
                                <span className="badge badge-normal">REQUIRED</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-header">
                      <div>
                        <h4 className="card-title">Actual Shop-Floor Execution Run</h4>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          Run ID: {currentExecution.execution_id} on {currentExecution.machine_id}
                        </span>
                      </div>
                      <span className="badge badge-info">Actual Run</span>
                    </div>

                    <div>
                      {currentExecution.actual_steps.map((stepName, idx) => {
                        const isAdded = currentExecution.deviation_info?.additional_steps.includes(stepName);
                        const isSOPStep = sop?.steps.includes(stepName);
                        const hasSequenceIssue = currentExecution.deviation_info?.sequence_issues.some((iss) =>
                          iss.includes(`'${stepName}'`)
                        );

                        let cardClass = 'matched';
                        if (isAdded) cardClass = 'added';
                        else if (hasSequenceIssue) cardClass = 'out-of-order';

                        return (
                          <div key={idx} className={`step-card ${cardClass}`}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="code-tag">Step {idx + 1}</span>
                                <strong>{stepName}</strong>
                              </div>
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                {isAdded ? '⚠️ Non-SOP addition (worker variation / workaround)' : isSOPStep ? 'Standard SOP step' : 'Unrecognized step'}
                              </span>
                            </div>
                            <div>
                              {isAdded ? (
                                <span className="badge badge-warning">+ ADDED STEP</span>
                              ) : hasSequenceIssue ? (
                                <span className="badge badge-info" style={{ backgroundColor: '#f3e8ff', color: '#6b21a8' }}>
                                  OUT OF ORDER
                                </span>
                              ) : (
                                <span className="badge badge-normal">
                                  <Check size={12} /> MATCHES SOP
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {currentExecution.deviation_info?.missing_steps.map((missingStep, idx) => (
                        <div key={`missing-${idx}`} className="step-card missing">
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="code-tag">Omitted</span>
                              <strong style={{ color: '#ef4444' }}>{missingStep}</strong>
                            </div>
                            <span style={{ fontSize: '12px', color: '#ef4444' }}>
                              Required SOP step was NOT executed
                            </span>
                          </div>
                          <div>
                            <span className="badge badge-danger">MISSING FROM RUN</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              MODULE 3: DEVIATION ANALYSIS
              ========================================================================= */}
          {activeTab === 'deviation' && (
            <div>
              <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header">
                  <div>
                    <h3 className="card-title">Detected Deviations Register</h3>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                      Total {filteredDeviations.length} deviating executions identified across all shifts.
                    </p>
                  </div>

                  <div className="filter-bar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Filter size={14} color="var(--text-secondary)" />
                      <span style={{ fontSize: '12px', fontWeight: '600' }}>Machine:</span>
                      {['ALL', 'MCH-01', 'MCH-02', 'MCH-03', 'MCH-04'].map((m) => (
                        <button
                          key={m}
                          onClick={() => setMchFilter(m)}
                          className={`filter-btn ${mchFilter === m ? 'active' : ''}`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '600' }}>Shift:</span>
                      {['ALL', 'Morning', 'Afternoon', 'Night'].map((s) => (
                        <button
                          key={s}
                          onClick={() => setShiftFilter(s)}
                          className={`filter-btn ${shiftFilter === s ? 'active' : ''}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="table-container">
                  <table className="styled-table">
                    <thead>
                      <tr>
                        <th>Execution ID</th>
                        <th>Product</th>
                        <th>Machine</th>
                        <th>Shift</th>
                        <th>Deviation Types</th>
                        <th>Specific Issues</th>
                        <th>Cycle Time</th>
                        <th>Outcome</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDeviations.map((dev) => (
                        <tr key={dev.execution_id}>
                          <td>
                            <span className="code-tag" style={{ fontWeight: '700' }}>{dev.execution_id}</span>
                          </td>
                          <td>{dev.product_name}</td>
                          <td><strong>{dev.machine_id}</strong></td>
                          <td>{dev.shift}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {dev.deviation_info?.deviation_types.map((type) => (
                                <span
                                  key={type}
                                  className={`badge ${
                                    type === 'missing_step'
                                      ? 'badge-danger'
                                      : type === 'additional_step'
                                      ? 'badge-warning'
                                      : 'badge-info'
                                  }`}
                                >
                                  {type.replace('_', ' ')}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td style={{ maxWidth: '260px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {dev.deviation_info?.explanation}
                          </td>
                          <td>{dev.cycle_time_seconds}s</td>
                          <td>
                            {dev.defect_detected ? (
                              <span className="badge badge-danger">Defect</span>
                            ) : dev.rework_required ? (
                              <span className="badge badge-warning">Rework</span>
                            ) : (
                              <span className="badge badge-normal">Clean</span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                onClick={() => {
                                  setSelectedExecId(dev.execution_id);
                                  setActiveTab('mirror');
                                }}
                                className="btn btn-secondary"
                                style={{ padding: '4px 8px', fontSize: '11.5px' }}
                                title="Inspect in Process Mirror"
                              >
                                Mirror
                              </button>
                              <button
                                onClick={() => {
                                  setInvestigationExecId(dev.execution_id);
                                  setValidationTargetId(dev.execution_id);
                                  loadInvestigation(dev.execution_id);
                                  setActiveTab('investigation');
                                }}
                                className="btn btn-primary"
                                style={{ padding: '4px 8px', fontSize: '11.5px' }}
                                title="Investigate with AI"
                              >
                                Investigate
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              MODULE 4: PATTERN ANALYSIS (PHASE 3)
              ========================================================================= */}
          {activeTab === 'pattern' && (
            <div>
              {/* Association vs Causation Safeguard Banner */}
              <div className="safeguard-banner">
                <ShieldAlert size={20} color="var(--accent-terracotta)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>Statistical Governance Notice: </strong>
                  {patternData?.causation_safeguard ||
                    'Observed patterns are statistical signals for operational inquiry, not confirmed mechanical or human root causes.'}
                </div>
              </div>

              {/* Pattern Overview Stat Cards */}
              <div className="grid-cols-4" style={{ marginBottom: '24px' }}>
                <div className="metric-card">
                  <div className="metric-header">
                    <span>Overall Deviation Rate</span>
                    <BarChart3 size={16} color="var(--accent-terracotta)" />
                  </div>
                  <div className="metric-value">{patternData?.overall_deviation_rate}%</div>
                  <div className="metric-sub">{patternData?.total_deviated} of {patternData?.total_executions} runs</div>
                </div>

                <div className="metric-card">
                  <div className="metric-header">
                    <span>Missing Step Frequency</span>
                    <AlertTriangle size={16} color="#ef4444" />
                  </div>
                  <div className="metric-value">{patternData?.type_frequency.missing_step}</div>
                  <div className="metric-sub">Calibration/Inspection skips</div>
                </div>

                <div className="metric-card">
                  <div className="metric-header">
                    <span>Added Step Frequency</span>
                    <Sparkles size={16} color="var(--accent-terracotta)" />
                  </div>
                  <div className="metric-value">{patternData?.type_frequency.additional_step}</div>
                  <div className="metric-sub">Manual Adjustments recorded</div>
                </div>

                <div className="metric-card">
                  <div className="metric-header">
                    <span>Sequence Issue Events</span>
                    <GitCompare size={16} color="#8b5cf6" />
                  </div>
                  <div className="metric-value">{patternData?.type_frequency.sequence_issue}</div>
                  <div className="metric-sub">Out-of-order execution</div>
                </div>
              </div>

              {/* Recurring Pattern Clusters Table */}
              <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header">
                  <div>
                    <h3 className="card-title">Recurring Process Clusters & Signal Thresholds</h3>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                      Identifies machine and shift operational intersections exhibiting statistically elevated variation rates.
                    </p>
                  </div>
                  <span className="badge badge-info">Cluster Analysis</span>
                </div>

                <div className="table-container">
                  <table className="styled-table">
                    <thead>
                      <tr>
                        <th>Pattern ID</th>
                        <th>Cluster Description</th>
                        <th>Machine</th>
                        <th>Shift</th>
                        <th>Dominant Variation Type</th>
                        <th>Occurrences</th>
                        <th>Rate in Group</th>
                        <th>Signal Status</th>
                        <th>Operational Inquiry Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patternData?.recurring_patterns.map((pat) => (
                        <tr key={pat.pattern_id}>
                          <td><span className="code-tag">{pat.pattern_id}</span></td>
                          <td><strong>{pat.pattern_description}</strong></td>
                          <td>{pat.machine_id}</td>
                          <td>{pat.shift}</td>
                          <td><span className="badge badge-warning">{pat.deviation_type}</span></td>
                          <td>{pat.occurrence_count} / {pat.total_group_executions}</td>
                          <td><strong>{pat.occurrence_rate}%</strong></td>
                          <td>
                            {pat.signal_flag === 'HIGH_VARIATION' ? (
                              <span className="badge badge-danger">HIGH VARIATION</span>
                            ) : pat.signal_flag === 'MODERATE_SIGNAL' ? (
                              <span className="badge badge-warning">MODERATE SIGNAL</span>
                            ) : (
                              <span className="badge badge-normal">STANDARD DISPERSION</span>
                            )}
                          </td>
                          <td style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '280px' }}>
                            {pat.signal_explanation}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              MODULE 5: IMPACT ANALYSIS (PHASE 3)
              ========================================================================= */}
          {activeTab === 'impact' && (
            <div>
              {/* Plain-Language Interpretation Card */}
              <div className="card" style={{ marginBottom: '24px', backgroundColor: '#faf9f5', borderColor: '#e2ddd0' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <Info size={22} color="var(--accent-teal)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <h4 style={{ fontSize: '14.5px', fontWeight: '700', marginBottom: '6px' }}>
                      Measured Operational Impact Assessment
                    </h4>
                    <p style={{ fontSize: '13.5px', color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: '8px' }}>
                      {impactData?.plain_language_interpretation}
                    </p>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {impactData?.sample_size_caveat}
                    </span>
                  </div>
                </div>
              </div>

              {/* Side-by-side Normal vs Deviated Comparison */}
              <div className="grid-cols-2" style={{ marginBottom: '24px' }}>
                {/* Normal Standard Group */}
                <div className="card" style={{ borderTop: '4px solid #22c55e' }}>
                  <div className="card-header">
                    <div>
                      <h4 className="card-title">Standard SOP Group (Adherence Baseline)</h4>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        N = {impactData?.normal_group.execution_count} executions
                      </span>
                    </div>
                    <span className="badge badge-normal">Baseline</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '10px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>Average Cycle Time:</span>
                      <span style={{ fontSize: '20px', fontWeight: '800', fontFamily: 'var(--font-mono)' }}>
                        {impactData?.normal_group.avg_cycle_time_seconds}s
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>Defect Rate:</span>
                      <span style={{ fontSize: '20px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: '#16a34a' }}>
                        {impactData?.normal_group.defect_rate_pct}%
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>Rework Rate:</span>
                      <span style={{ fontSize: '20px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: '#16a34a' }}>
                        {impactData?.normal_group.rework_rate_pct}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Deviated Group */}
                <div className="card" style={{ borderTop: '4px solid var(--accent-terracotta)' }}>
                  <div className="card-header">
                    <div>
                      <h4 className="card-title">Observed Variations Group (Deviations)</h4>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        N = {impactData?.deviated_group.execution_count} executions
                      </span>
                    </div>
                    <span className="badge badge-warning">Variations</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '10px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>Average Cycle Time:</span>
                      <span style={{ fontSize: '20px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: 'var(--accent-terracotta)' }}>
                        {impactData?.deviated_group.avg_cycle_time_seconds}s
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>Defect Rate:</span>
                      <span style={{ fontSize: '20px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: '#dc2626' }}>
                        {impactData?.deviated_group.defect_rate_pct}%
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>Rework Rate:</span>
                      <span style={{ fontSize: '20px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: '#d97706' }}>
                        {impactData?.deviated_group.rework_rate_pct}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mathematical Difference Summary Cards */}
              <div className="grid-cols-4">
                <div className="metric-card">
                  <div className="metric-header">
                    <span>Cycle Time Difference</span>
                    <Clock size={16} color="var(--accent-terracotta)" />
                  </div>
                  <div className="metric-value">
                    {impactData ? `${impactData.cycle_time_diff_seconds > 0 ? '+' : ''}${impactData.cycle_time_diff_seconds}s` : '--'}
                  </div>
                  <div className="metric-sub">Absolute elapsed time delta</div>
                </div>

                <div className="metric-card">
                  <div className="metric-header">
                    <span>Relative Cycle Time %</span>
                    <TrendingDown size={16} color="var(--accent-terracotta)" />
                  </div>
                  <div className="metric-value">
                    {impactData ? `${impactData.cycle_time_relative_pct > 0 ? '+' : ''}${impactData.cycle_time_relative_pct}%` : '--'}
                  </div>
                  <div className="metric-sub">Percentage change vs baseline</div>
                </div>

                <div className="metric-card">
                  <div className="metric-header">
                    <span>Defect Rate Delta</span>
                    <AlertTriangle size={16} color="#ef4444" />
                  </div>
                  <div className="metric-value" style={{ color: '#ef4444' }}>
                    {impactData ? `${impactData.defect_rate_diff_points > 0 ? '+' : ''}${impactData.defect_rate_diff_points}` : '--'} pts
                  </div>
                  <div className="metric-sub">Percentage-point change</div>
                </div>

                <div className="metric-card">
                  <div className="metric-header">
                    <span>Rework Rate Delta</span>
                    <GitCompare size={16} color="#d97706" />
                  </div>
                  <div className="metric-value" style={{ color: '#d97706' }}>
                    {impactData ? `${impactData.rework_rate_diff_points > 0 ? '+' : ''}${impactData.rework_rate_diff_points}` : '--'} pts
                  </div>
                  <div className="metric-sub">Percentage-point change</div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              MODULE 6: AI INVESTIGATION ASSISTANT (PHASE 3)
              ========================================================================= */}
          {activeTab === 'investigation' && (
            <div>
              {/* Investigation Header & Target Selector */}
              <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header">
                  <div>
                    <h3 className="card-title">AI Investigation Assistant (Evidence-Grounded)</h3>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                      Supplies structured facts, non-dogmatic hypotheses, manager checks, and historical process memory.
                    </p>
                  </div>
                  <div className="badge badge-info">
                    {investigationResult?.engine_mode || 'Deterministic Fallback Engine'}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600' }}>Select Execution to Investigate:</label>
                  <select
                    value={investigationExecId}
                    onChange={(e) => {
                      setInvestigationExecId(e.target.value);
                      setValidationTargetId(e.target.value);
                      loadInvestigation(e.target.value);
                    }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-medium)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '13px',
                      backgroundColor: 'var(--bg-surface)',
                    }}
                  >
                    {deviations.map((d) => (
                      <option key={d.execution_id} value={d.execution_id}>
                        {d.execution_id} — {d.machine_id} ({d.shift}) | {d.deviation_info?.deviation_types.join(', ')}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => loadInvestigation(investigationExecId)}
                    disabled={investigationLoading}
                    className="btn btn-secondary"
                  >
                    <RefreshCw size={14} className={investigationLoading ? 'animate-spin' : ''} />
                    <span>Re-analyze</span>
                  </button>

                  <button
                    onClick={() => {
                      setValidationTargetId(investigationExecId);
                      setActiveTab('validation');
                    }}
                    className="btn btn-primary"
                    style={{ marginLeft: 'auto' }}
                  >
                    <span>Proceed to Human Validation</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              {/* Historical Process Memory Match Banner */}
              {investigationMatch && (
                <div
                  className="card"
                  style={{
                    marginBottom: '24px',
                    backgroundColor: investigationMatch.has_history ? '#f4fbf7' : 'var(--bg-surface)',
                    borderColor: investigationMatch.has_history ? '#b7e4c7' : 'var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Database size={18} color="var(--accent-teal)" />
                      <strong style={{ fontSize: '14px' }}>Process Memory Match:</strong>
                      <span
                        className={`memory-badge ${
                          investigationMatch.status === 'Previously Validated Variation'
                            ? 'validated'
                            : investigationMatch.status === 'Requires Further Investigation'
                            ? 'investigation'
                            : investigationMatch.status === 'Previously Rejected'
                            ? 'rejected'
                            : 'none'
                        }`}
                      >
                        {investigationMatch.status}
                      </span>
                    </div>
                    <span className="code-tag" style={{ fontSize: '11.5px' }}>
                      Signature: {investigationMatch.deviation_signature}
                    </span>
                  </div>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    {investigationMatch.matching_rule_explanation}
                  </p>
                </div>
              )}

              {/* Main Investigation Split Layout */}
              {investigationResult && (
                <div className="grid-cols-2" style={{ marginBottom: '24px' }}>
                  {/* Left Column: Observed Evidence & Hypotheses */}
                  <div>
                    {/* Observed Evidence */}
                    <div className="card" style={{ marginBottom: '20px' }}>
                      <div className="card-header">
                        <h4 className="card-title">1. Observed Evidence (Verified Facts)</h4>
                        <span className="badge badge-normal">Deterministic Facts</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {investigationResult.observed_evidence.map((ev, i) => (
                          <div key={i} className="check-item">
                            <Check size={14} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
                            <span>{ev}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Possible Hypotheses */}
                    <div className="card">
                      <div className="card-header">
                        <h4 className="card-title">2. Plausible Operational Hypotheses</h4>
                        <span className="badge badge-warning">Unconfirmed Hypotheses</span>
                      </div>
                      <div>
                        {investigationResult.possible_hypotheses.map((hyp, i) => (
                          <div key={i} className="hypothesis-card">
                            <div className="hypothesis-title">Hypothesis Scenario {i + 1}</div>
                            <div className="hypothesis-desc">{hyp}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Recommended Checks & Risk Considerations */}
                  <div>
                    {/* Recommended Checks */}
                    <div className="card" style={{ marginBottom: '20px' }}>
                      <div className="card-header">
                        <h4 className="card-title">3. Recommended Shop-Floor Checks</h4>
                        <span className="badge badge-info">Actionable Inquiries</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {investigationResult.recommended_checks.map((checkText, i) => (
                          <div key={i} className="check-item" style={{ backgroundColor: '#f0fdf4' }}>
                            <ChevronRight size={14} color="#15803d" style={{ flexShrink: 0, marginTop: '2px' }} />
                            <span>{checkText}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Operational Risks */}
                    <div className="card" style={{ marginBottom: '20px' }}>
                      <div className="card-header">
                        <h4 className="card-title">4. Operational & Compliance Risks</h4>
                        <span className="badge badge-danger">Risk Factors</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {investigationResult.risk_considerations.map((riskText, i) => (
                          <div key={i} className="check-item" style={{ backgroundColor: '#fef2f2' }}>
                            <AlertTriangle size={14} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                            <span>{riskText}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Limitations & Confidence Disclaimer */}
                    <div className="card" style={{ backgroundColor: '#faf9f5' }}>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <Info size={16} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          <strong>AI Governance: </strong>
                          {investigationResult.confidence_and_limitations}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              MODULE 7: HUMAN VALIDATION (PHASE 3)
              ========================================================================= */}
          {activeTab === 'validation' && (
            <div>
              <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header">
                  <div>
                    <h3 className="card-title">Human Manager Validation Review</h3>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                      Preserves managerial governance. Only humans may validate an improvement, mandate investigation, or reject a variation.
                    </p>
                  </div>
                  <span className="badge badge-info">Persistent Governance</span>
                </div>

                {/* Target Execution Selector */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
                    Select Execution for Manager Review:
                  </label>
                  <select
                    value={validationTargetId}
                    onChange={(e) => setValidationTargetId(e.target.value)}
                    style={{
                      width: '100%',
                      maxWidth: '500px',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-medium)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '13.5px',
                      backgroundColor: 'var(--bg-surface)',
                    }}
                  >
                    {pendingValidations.map((d) => (
                      <option key={d.execution_id} value={d.execution_id}>
                        {d.execution_id} — {d.machine_id} ({d.shift}) | {d.product_name} | {d.deviation_info?.explanation}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Validation Form */}
                <form onSubmit={handleValidationSubmit}>
                  {/* Three Explicit Decision Options */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '700', display: 'block', marginBottom: '10px' }}>
                      Select Managerial Decision:
                    </label>
                    <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedDecision('Validate Improvement')}
                        className={`decision-btn ${selectedDecision === 'Validate Improvement' ? 'active-validate' : ''}`}
                      >
                        <ThumbsUp size={22} color={selectedDecision === 'Validate Improvement' ? '#1e7b85' : 'var(--text-muted)'} />
                        <strong style={{ fontSize: '14px' }}>1. Validate Improvement</strong>
                        <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                          Variation shows beneficial outcome; supports SOP review consideration.
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedDecision('Needs Further Investigation')}
                        className={`decision-btn ${selectedDecision === 'Needs Further Investigation' ? 'active-investigate' : ''}`}
                      >
                        <HelpCircle size={22} color={selectedDecision === 'Needs Further Investigation' ? '#d97706' : 'var(--text-muted)'} />
                        <strong style={{ fontSize: '14px' }}>2. Needs Further Investigation</strong>
                        <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                          Evidence is inconclusive; shop-floor checks or tooling audits required.
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedDecision('Reject / Correct Deviation')}
                        className={`decision-btn ${selectedDecision === 'Reject / Correct Deviation' ? 'active-reject' : ''}`}
                      >
                        <XOctagon size={22} color={selectedDecision === 'Reject / Correct Deviation' ? '#dc2626' : 'var(--text-muted)'} />
                        <strong style={{ fontSize: '14px' }}>3. Reject / Correct Deviation</strong>
                        <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                          Harmful deviation or safety/quality non-compliance; corrective action mandated.
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Reviewer Identifier */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                      Reviewer Identifier (Simulated Identity):
                    </label>
                    <input
                      type="text"
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        maxWidth: '500px',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-medium)',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  {/* Required Manager Justification Reason */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                      Manager Reason / Supporting Justification (Required):
                    </label>
                    <textarea
                      rows={3}
                      value={justificationReason}
                      onChange={(e) => setJustificationReason(e.target.value)}
                      placeholder="Enter specific shop-floor evidence, observed tolerance checks, or rationale..."
                      required
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-medium)',
                        fontSize: '13px',
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>

                  {/* Feedback Banner */}
                  {validationFeedback && (
                    <div
                      style={{
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-sm)',
                        marginBottom: '16px',
                        backgroundColor: validationFeedback.type === 'success' ? '#e6f4ea' : '#fce8e6',
                        color: validationFeedback.type === 'success' ? '#137333' : '#c5221f',
                        border: `1px solid ${validationFeedback.type === 'success' ? '#ceead6' : '#fad2cf'}`,
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      {validationFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                      <span>{validationFeedback.message}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={validationSubmitting}
                    className="btn btn-primary"
                    style={{ padding: '10px 20px', fontSize: '14px' }}
                  >
                    <Send size={15} />
                    <span>{validationSubmitting ? 'Persisting to SQLite...' : 'Save & Persist Manager Decision'}</span>
                  </button>
                </form>
              </div>

              {/* Recent Saved Decisions Preview */}
              <div className="card">
                <div className="card-header">
                  <h4 className="card-title">Recent Persistent Validation History ({validationHistory.length} Recorded)</h4>
                  <button onClick={() => setActiveTab('memory')} className="btn btn-secondary" style={{ fontSize: '12px' }}>
                    View Full Process Memory
                  </button>
                </div>
                {validationHistory.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    No decisions recorded yet. Submit your first validation above to initiate persistent process memory!
                  </p>
                ) : (
                  <div className="table-container">
                    <table className="styled-table">
                      <thead>
                        <tr>
                          <th>Decision ID</th>
                          <th>Execution</th>
                          <th>Decision</th>
                          <th>Reviewer</th>
                          <th>Signature</th>
                          <th>Reason</th>
                          <th>Timestamp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validationHistory.slice(0, 5).map((rec) => (
                          <tr key={rec.decision_id}>
                            <td><span className="code-tag">{rec.decision_id}</span></td>
                            <td><strong>{rec.execution_id}</strong></td>
                            <td>
                              <span
                                className={`badge ${
                                  rec.decision === 'Validate Improvement'
                                    ? 'badge-normal'
                                    : rec.decision === 'Needs Further Investigation'
                                    ? 'badge-warning'
                                    : 'badge-danger'
                                }`}
                              >
                                {rec.decision}
                              </span>
                            </td>
                            <td>{rec.reviewer}</td>
                            <td><span className="code-tag" style={{ fontSize: '11px' }}>{rec.deviation_signature}</span></td>
                            <td style={{ fontSize: '12px', maxWidth: '240px' }}>{rec.reason}</td>
                            <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{rec.timestamp}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =========================================================================
              MODULE 8: PROCESS MEMORY (PHASE 3)
              ========================================================================= */}
          {activeTab === 'memory' && (
            <div>
              <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header">
                  <div>
                    <h3 className="card-title">Persistent Process Knowledge Memory (SQLite)</h3>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                      Maintains institutional decision memory across server restarts. Connects recurring deviations with previous managerial assessments.
                    </p>
                  </div>
                  <span className="badge badge-normal">SQLite Database Active</span>
                </div>

                {/* Filter and Search Bar */}
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Filter size={14} color="var(--text-secondary)" />
                    <span style={{ fontSize: '12px', fontWeight: '600' }}>Filter Decision:</span>
                    {['ALL', 'Validate Improvement', 'Needs Further Investigation', 'Reject / Correct Deviation'].map((f) => (
                      <button
                        key={f}
                        onClick={() => setMemoryFilter(f)}
                        className={`filter-btn ${memoryFilter === f ? 'active' : ''}`}
                      >
                        {f === 'ALL' ? 'All' : f}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                    <Search size={14} color="var(--text-muted)" />
                    <input
                      type="text"
                      placeholder="Search memory..."
                      value={memorySearch}
                      onChange={(e) => setMemorySearch(e.target.value)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-medium)',
                        fontSize: '12.5px',
                        width: '200px',
                      }}
                    />
                  </div>
                </div>

                {/* Memory Table */}
                <div className="table-container">
                  <table className="styled-table">
                    <thead>
                      <tr>
                        <th>Decision ID</th>
                        <th>Execution ID</th>
                        <th>Decision Status</th>
                        <th>Reviewer</th>
                        <th>Deviation Signature</th>
                        <th>Manager Justification Notes</th>
                        <th>Machine / Shift</th>
                        <th>Recorded Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHistory.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                            No process memory records match your filter.
                          </td>
                        </tr>
                      ) : (
                        filteredHistory.map((item) => (
                          <tr key={item.decision_id}>
                            <td><span className="code-tag">{item.decision_id}</span></td>
                            <td><strong>{item.execution_id}</strong></td>
                            <td>
                              <span
                                className={`badge ${
                                  item.decision === 'Validate Improvement'
                                    ? 'badge-normal'
                                    : item.decision === 'Needs Further Investigation'
                                    ? 'badge-warning'
                                    : 'badge-danger'
                                }`}
                              >
                                {item.decision}
                              </span>
                            </td>
                            <td>{item.reviewer}</td>
                            <td>
                              <span className="code-tag" style={{ fontSize: '11px', color: 'var(--accent-teal)' }}>
                                {item.deviation_signature}
                              </span>
                            </td>
                            <td style={{ fontSize: '12.5px', maxWidth: '300px' }}>{item.reason}</td>
                            <td>{item.machine_id} ({item.shift})</td>
                            <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.timestamp}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              MODULE 9: SOP REVIEW OPPORTUNITIES (PHASE 4 TEASER)
              ========================================================================= */}
          {activeTab === 'sop_review' && (
            <div className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">SOP Review & Evolution Opportunities</h3>
                  <span className="badge badge-warning" style={{ marginTop: '6px' }}>
                    Coming in Final Phase
                  </span>
                </div>
              </div>
              <div style={{ padding: '20px 0', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <p style={{ marginBottom: '16px' }}>
                  This module connects recurring variations validated by managers in Module 7 & 8 into formal SOP evolution candidates.
                </p>
                <div style={{ backgroundColor: 'var(--bg-surface-subtle)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>
                    Qualification Criteria for Official SOP Review:
                  </h4>
                  <ul style={{ paddingLeft: '20px', fontSize: '13px' }}>
                    <li>Recurrence threshold: Variation must occur across at least 10 executions.</li>
                    <li>Manager validation: Must possess at least 1 'Validate Improvement' decision in Process Memory.</li>
                    <li>Quality confirmation: Defect rate must be less than or equal to factory baseline.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
