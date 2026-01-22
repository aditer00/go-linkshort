package models

import "time"

// URL represents a shortened URL entity
type URL struct {
	ID          string    `json:"id"`
	ShortCode   string    `json:"short_code"`
	OriginalURL string    `json:"original_url"`
	CreatedAt   time.Time `json:"created_at"`
}

// CreateURLRequest is the request body for creating a short URL
type CreateURLRequest struct {
	URL string `json:"url"`
}

// CreateURLResponse is the response body after creating a short URL
type CreateURLResponse struct {
	ShortCode   string `json:"short_code"`
	ShortURL    string `json:"short_url"`
	OriginalURL string `json:"original_url"`
}
