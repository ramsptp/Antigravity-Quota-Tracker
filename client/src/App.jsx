import { useState, useEffect } from 'react';
import './App.css';

function App() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/quota');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();

            if (result.error) {
                throw new Error(result.message || 'API returned an error');
            }

            setData(result);
            setError(null);
        } catch (err) {
            console.error("Fetch error:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    const getDurationString = (targetDate) => {
        const now = new Date();
        const diff = targetDate - now;
        if (diff <= 0) return 'Ready';

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
        return `${hours}h ${minutes}m`;
    };

    if (loading && !data) return (
        <div className="container">
            <div className="loading">
                <div className="spinner"></div> Loading Quota Data...
            </div>
        </div>
    );

    if (error && !data) return (
        <div className="container">
            <div className="header">
                <div className="title">Antigravity Quota</div>
            </div>
            <div className="error-message">
                <h3>Connection Error</h3>
                <p>{error}</p>
                <button onClick={fetchData} style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>Retry</button>
            </div>
        </div>
    );

    const userStatus = data?.userStatus;
    const planInfo = userStatus?.planStatus?.planInfo;

    // Prompt Credits
    const availableCredits = userStatus?.planStatus?.availablePromptCredits || 0;
    const monthlyCredits = planInfo?.monthlyPromptCredits || 1;
    const creditPercent = (availableCredits / monthlyCredits) * 100;

    // Flow Credits
    const availableFlow = userStatus?.planStatus?.availableFlowCredits || 0;
    const monthlyFlow = planInfo?.monthlyFlowCredits || 1;
    const flowPercent = (availableFlow / monthlyFlow) * 100;

    const models = userStatus?.cascadeModelConfigData?.clientModelConfigs || [];

    return (
        <div className="container">
            <div className="header">
                <div className="title">Antigravity Quota</div>
                {userStatus?.userTier && (
                    <div className="tier-badge">{userStatus.userTier.name}</div>
                )}
            </div>

            <div className="grid">
                {/* Prompt Credits Card */}
                <div className="card">
                    <div className="card-title">Prompt Credits</div>
                    <div className="stat-value">{availableCredits.toLocaleString()}</div>
                    <div className="stat-sub">of {monthlyCredits.toLocaleString()} monthly</div>
                    <div className="progress-container">
                        <div
                            className="progress-bar"
                            style={{ width: `${creditPercent}%`, backgroundColor: creditPercent < 20 ? 'var(--danger-color)' : 'var(--accent-color)' }}
                        ></div>
                    </div>
                </div>

                {/* Flow Credits Card */}
                <div className="card">
                    <div className="card-title">Flow Credits</div>
                    <div className="stat-value">{availableFlow.toLocaleString()}</div>
                    <div className="stat-sub">of {monthlyFlow.toLocaleString()} monthly</div>
                    <div className="progress-container">
                        <div
                            className="progress-bar"
                            style={{ width: `${flowPercent}%`, backgroundColor: flowPercent < 20 ? 'var(--danger-color)' : 'var(--accent-color)' }}
                        ></div>
                    </div>
                </div>

                {/* Plan Info Card */}
                <div className="card">
                    <div className="card-title">Plan Details</div>
                    <div className="stat-sub"><strong>Type:</strong> {planInfo?.planName}</div>
                    <div className="stat-sub"><strong>Fast Mode:</strong> {planInfo?.hasAutocompleteFastMode ? 'Enabled' : 'Disabled'}</div>
                    <div className="stat-sub"><strong>Context:</strong> {parseInt(planInfo?.maxNumChatInputTokens || 0).toLocaleString()} tokens</div>
                </div>

                {/* Models Card */}
                <div className="card" style={{ gridColumn: '1 / -1' }}>
                    <div className="card-title">Model Quotas</div>
                    <div className="models-list">
                        {models.map((model, idx) => {
                            const remaining = model.quotaInfo?.remainingFraction ?? 0;
                            const resetDate = model.quotaInfo?.resetTime ? new Date(model.quotaInfo.resetTime) : null;
                            const timeRemaining = resetDate ? getDurationString(resetDate) : '';

                            if (!model.isRecommended) return null; // Filter mostly extraneous models

                            return (
                                <div key={idx} className="model-item">
                                    <div>
                                        <div className="model-name">{model.label}</div>
                                        <div className="model-reset">
                                            {resetDate ?
                                                <span>Resets: {resetDate.toLocaleString()} <span style={{ color: 'var(--accent-color)' }}>({timeRemaining})</span></span>
                                                : 'No limit'}
                                        </div>
                                    </div>
                                    <div style={{ width: '40%', textAlign: 'right' }}>
                                        <div className="stat-sub">{Math.round(remaining * 100)}%</div>
                                        <div className="progress-container" style={{ marginTop: '5px', height: '6px' }}>
                                            <div
                                                className="progress-bar"
                                                style={{ width: `${remaining * 100}%`, backgroundColor: remaining < 0.2 ? 'var(--danger-color)' : 'var(--success-color)' }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                Live data from local Antigravity Language Server • Auto-refreshing every 30s
            </div>
        </div>
    );
}

export default App;
