'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

interface ClickEvent {
    id: string;
    short_code: string;
    timestamp: string;
    user_agent: string;
    referrer: string;
}

interface Stats {
    short_code: string;
    total_clicks: number;
    clicks?: ClickEvent[];
}

const ANALYTICS_SERVICE = process.env.NEXT_PUBLIC_ANALYTICS_SERVICE || 'http://localhost:8081';
const URL_SERVICE = process.env.NEXT_PUBLIC_URL_SERVICE || 'http://localhost:8080';

export default function AnalyticsPage() {
    const [stats, setStats] = useState<Stats[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [totalClicks, setTotalClicks] = useState(0);

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 5000); // Refresh every 5 seconds
        return () => clearInterval(interval);
    }, []);

    const fetchStats = async () => {
        try {
            const response = await fetch(`${ANALYTICS_SERVICE}/stats`);
            if (response.ok) {
                const data = await response.json();
                setStats(data || []);
                const total = (data || []).reduce((acc: number, s: Stats) => acc + s.total_clicks, 0);
                setTotalClicks(total);
            }
            setLoading(false);
        } catch (err) {
            console.error('Failed to fetch stats:', err);
            setError('Failed to load analytics data');
            setLoading(false);
        }
    };

    const chartData = {
        labels: stats.map(s => s.short_code),
        datasets: [
            {
                label: 'Clicks',
                data: stats.map(s => s.total_clicks),
                backgroundColor: [
                    'rgba(99, 102, 241, 0.8)',
                    'rgba(139, 92, 246, 0.8)',
                    'rgba(168, 85, 247, 0.8)',
                    'rgba(192, 132, 252, 0.8)',
                    'rgba(221, 214, 254, 0.8)',
                ],
                borderColor: [
                    'rgb(99, 102, 241)',
                    'rgb(139, 92, 246)',
                    'rgb(168, 85, 247)',
                    'rgb(192, 132, 252)',
                    'rgb(221, 214, 254)',
                ],
                borderWidth: 2,
                borderRadius: 8,
            },
        ],
    };

    const barOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            title: {
                display: true,
                text: 'Clicks per URL',
                color: '#a1a1aa',
                font: {
                    size: 14,
                    weight: 500,
                },
            },
        },
        scales: {
            x: {
                grid: {
                    color: 'rgba(39, 39, 42, 0.5)',
                },
                ticks: {
                    color: '#a1a1aa',
                },
            },
            y: {
                grid: {
                    color: 'rgba(39, 39, 42, 0.5)',
                },
                ticks: {
                    color: '#a1a1aa',
                    stepSize: 1,
                },
                beginAtZero: true,
            },
        },
    };

    const doughnutData = {
        labels: stats.map(s => s.short_code),
        datasets: [
            {
                data: stats.map(s => s.total_clicks),
                backgroundColor: [
                    'rgba(99, 102, 241, 0.8)',
                    'rgba(139, 92, 246, 0.8)',
                    'rgba(168, 85, 247, 0.8)',
                    'rgba(192, 132, 252, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                ],
                borderColor: '#1a1a24',
                borderWidth: 3,
            },
        ],
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: {
                    color: '#a1a1aa',
                    padding: 20,
                    font: {
                        size: 12,
                    },
                },
            },
            title: {
                display: true,
                text: 'Click Distribution',
                color: '#a1a1aa',
                font: {
                    size: 14,
                    weight: 500,
                },
            },
        },
    };

    return (
        <main className="main">
            <div className="container">
                <header className="header">
                    <h1 className="logo">LinkShort</h1>
                    <p className="subtitle">Analytics Dashboard</p>
                    <nav className="nav">
                        <Link href="/" className="navLink">
                            🔗 Shorten
                        </Link>
                        <Link href="/analytics" className="navLink navLinkActive">
                            📊 Analytics
                        </Link>
                    </nav>
                </header>

                <div className="statsGrid">
                    <div className="statCard">
                        <div className="statValue">{stats.length}</div>
                        <div className="statLabel">Total URLs</div>
                    </div>
                    <div className="statCard">
                        <div className="statValue">{totalClicks}</div>
                        <div className="statLabel">Total Clicks</div>
                    </div>
                    <div className="statCard">
                        <div className="statValue">
                            {stats.length > 0 ? (totalClicks / stats.length).toFixed(1) : '0'}
                        </div>
                        <div className="statLabel">Avg. Clicks/URL</div>
                    </div>
                    <div className="statCard">
                        <div className="statValue">
                            {stats.length > 0 ? Math.max(...stats.map(s => s.total_clicks)) : 0}
                        </div>
                        <div className="statLabel">Top Performer</div>
                    </div>
                </div>

                {loading ? (
                    <div className="card">
                        <div className="loading">
                            <span className="spinner"></span>
                            Loading analytics...
                        </div>
                    </div>
                ) : error ? (
                    <div className="card">
                        <div className="error">{error}</div>
                    </div>
                ) : stats.length === 0 ? (
                    <div className="card">
                        <div className="emptyState">
                            <div className="emptyIcon">📊</div>
                            <p className="emptyText">No analytics data yet. Start shortening URLs and sharing them!</p>
                        </div>
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                            <div className="card">
                                <h2 className="cardTitle">
                                    <span>📈</span>
                                    Click Statistics
                                </h2>
                                <div className="chartContainer">
                                    <Bar data={chartData} options={barOptions} />
                                </div>
                            </div>
                            <div className="card">
                                <h2 className="cardTitle">
                                    <span>🥧</span>
                                    Distribution
                                </h2>
                                <div className="chartContainer">
                                    <Doughnut data={doughnutData} options={doughnutOptions} />
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <h2 className="cardTitle">
                                <span>📋</span>
                                Detailed Stats
                            </h2>
                            <table className="statsTable">
                                <thead>
                                    <tr>
                                        <th>Short Code</th>
                                        <th>Clicks</th>
                                        <th>Short URL</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.map((stat) => (
                                        <tr key={stat.short_code}>
                                            <td>
                                                <span style={{
                                                    background: 'rgba(99, 102, 241, 0.2)',
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '6px',
                                                    fontFamily: 'monospace',
                                                    fontWeight: 600
                                                }}>
                                                    {stat.short_code}
                                                </span>
                                            </td>
                                            <td>
                                                <span style={{
                                                    fontWeight: 700,
                                                    fontSize: '1.1rem'
                                                }}>
                                                    {stat.total_clicks}
                                                </span>
                                            </td>
                                            <td style={{ color: 'var(--text-muted)' }}>
                                                {URL_SERVICE}/{stat.short_code}
                                            </td>
                                            <td>
                                                <a
                                                    href={`${URL_SERVICE}/${stat.short_code}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="btn btnSecondary btnSmall"
                                                >
                                                    🔗 Visit
                                                </a>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </main>
    );
}
