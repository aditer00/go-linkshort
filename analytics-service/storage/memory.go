package storage

import (
	"sync"
	"time"

	"analytics-service/models"

	"github.com/google/uuid"
)

// AnalyticsStorage defines the interface for analytics storage operations
// This interface allows easy extension to other storage backends
type AnalyticsStorage interface {
	SaveClick(event *models.ClickEvent) error
	GetStatsByShortCode(shortCode string) (*models.Stats, error)
	GetAllStats() ([]*models.Stats, error)
}

// MemoryStorage implements AnalyticsStorage using an in-memory map
type MemoryStorage struct {
	mu     sync.RWMutex
	clicks map[string][]*models.ClickEvent // shortCode -> list of clicks
}

// NewMemoryStorage creates a new in-memory analytics storage instance
func NewMemoryStorage() *MemoryStorage {
	return &MemoryStorage{
		clicks: make(map[string][]*models.ClickEvent),
	}
}

// SaveClick stores a click event in memory
func (s *MemoryStorage) SaveClick(event *models.ClickEvent) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if event.ID == "" {
		event.ID = uuid.New().String()
	}
	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now()
	}

	s.clicks[event.ShortCode] = append(s.clicks[event.ShortCode], event)
	return nil
}

// GetStatsByShortCode retrieves stats for a specific short code
func (s *MemoryStorage) GetStatsByShortCode(shortCode string) (*models.Stats, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	clicks, exists := s.clicks[shortCode]
	if !exists {
		return &models.Stats{
			ShortCode:   shortCode,
			TotalClicks: 0,
			Clicks:      []*models.ClickEvent{},
		}, nil
	}

	return &models.Stats{
		ShortCode:   shortCode,
		TotalClicks: len(clicks),
		Clicks:      clicks,
	}, nil
}

// GetAllStats retrieves stats for all short codes
func (s *MemoryStorage) GetAllStats() ([]*models.Stats, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	stats := make([]*models.Stats, 0, len(s.clicks))
	for shortCode, clicks := range s.clicks {
		stats = append(stats, &models.Stats{
			ShortCode:   shortCode,
			TotalClicks: len(clicks),
		})
	}

	return stats, nil
}
