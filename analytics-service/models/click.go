package models

import "time"

// ClickEvent represents a single click on a shortened URL
type ClickEvent struct {
	ID        string    `json:"id"`
	ShortCode string    `json:"short_code"`
	Timestamp time.Time `json:"timestamp"`
	UserAgent string    `json:"user_agent"`
	Referrer  string    `json:"referrer"`
}

// TrackRequest is the request body for tracking a click
type TrackRequest struct {
	ShortCode string `json:"short_code"`
	UserAgent string `json:"user_agent"`
	Referrer  string `json:"referrer"`
}

// Stats represents statistics for a short code
type Stats struct {
	ShortCode   string        `json:"short_code"`
	TotalClicks int           `json:"total_clicks"`
	Clicks      []*ClickEvent `json:"clicks,omitempty"`
}

// StatsResponse is the response for all stats
type AllStatsResponse struct {
	Stats []*Stats `json:"stats"`
}
