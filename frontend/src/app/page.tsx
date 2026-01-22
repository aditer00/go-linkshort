'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ShortenedUrl {
    short_code: string;
    short_url: string;
    original_url: string;
    created_at?: string;
}

const URL_SERVICE = process.env.NEXT_PUBLIC_URL_SERVICE || 'http://localhost:8080';
const SHORT_URL_DOMAIN = process.env.NEXT_PUBLIC_SHORT_URL_DOMAIN || URL_SERVICE;

export default function Home() {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ShortenedUrl | null>(null);
    const [urls, setUrls] = useState<ShortenedUrl[]>([]);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        fetchUrls();
    }, []);

    const fetchUrls = async () => {
        try {
            const response = await fetch(`${URL_SERVICE}/urls`);
            if (response.ok) {
                const data = await response.json();
                setUrls(data || []);
            }
        } catch (err) {
            console.error('Failed to fetch URLs:', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url.trim()) return;

        setLoading(true);
        setError('');
        setResult(null);

        try {
            const response = await fetch(`${URL_SERVICE}/shorten`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: url.trim() }),
            });

            if (!response.ok) {
                throw new Error('Failed to shorten URL');
            }

            const data = await response.json();
            setResult(data);
            setUrl('');
            fetchUrls();
        } catch (err) {
            setError('Failed to shorten URL. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <main className="main">
            <div className="container">
                <header className="header">
                    <h1 className="logo">LinkShort</h1>
                    <p className="subtitle">Shorten your URLs with style</p>
                    <nav className="nav">
                        <Link href="/" className="navLink navLinkActive">
                            🔗 Shorten
                        </Link>
                        <Link href="/analytics" className="navLink">
                            📊 Analytics
                        </Link>
                    </nav>
                </header>

                <div className="card">
                    <h2 className="cardTitle">
                        <span>✨</span>
                        Create Short URL
                    </h2>

                    <form onSubmit={handleSubmit}>
                        <div className="formGroup">
                            <label className="label" htmlFor="url">Enter your long URL</label>
                            <div className="inputGroup">
                                <input
                                    id="url"
                                    type="text"
                                    className="input"
                                    placeholder="https://example.com/very/long/url/that/needs/shortening"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    disabled={loading}
                                />
                                <button
                                    type="submit"
                                    className="btn btnPrimary"
                                    disabled={loading || !url.trim()}
                                >
                                    {loading ? (
                                        <>
                                            <span className="spinner"></span>
                                            Shortening...
                                        </>
                                    ) : (
                                        '🚀 Shorten'
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>

                    {error && <div className="error">{error}</div>}

                    {result && (
                        <div className="resultBox">
                            <div className="resultLabel">✅ URL shortened successfully!</div>
                            <div className="resultUrl">
                                <span className="resultUrlText">{SHORT_URL_DOMAIN}/{result.short_code}</span>
                                <button
                                    className="copyBtn"
                                    onClick={() => copyToClipboard(`${SHORT_URL_DOMAIN}/${result.short_code}`)}
                                >
                                    {copied ? '✓ Copied!' : '📋 Copy'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="card">
                    <h2 className="cardTitle">
                        <span>📋</span>
                        Recent URLs
                    </h2>

                    {urls.length === 0 ? (
                        <div className="emptyState">
                            <div className="emptyIcon">🔗</div>
                            <p className="emptyText">No URLs shortened yet. Create your first one above!</p>
                        </div>
                    ) : (
                        <div className="urlList">
                            {urls.slice().reverse().map((item) => (
                                <div key={item.short_code} className="urlItem">
                                    <div className="urlInfo">
                                        <div className="urlShort">{SHORT_URL_DOMAIN}/{item.short_code}</div>
                                        <div className="urlOriginal">{item.original_url}</div>
                                    </div>
                                    <div className="urlActions">
                                        <button
                                            className="btn btnSecondary btnSmall"
                                            onClick={() => copyToClipboard(`${SHORT_URL_DOMAIN}/${item.short_code}`)}
                                        >
                                            📋 Copy
                                        </button>
                                        <a
                                            href={`${SHORT_URL_DOMAIN}/${item.short_code}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn btnSecondary btnSmall"
                                        >
                                            🔗 Open
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {copied && (
                <div className="toast toastSuccess">
                    ✅ Copied to clipboard!
                </div>
            )}
        </main>
    );
}
