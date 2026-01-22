package storage

import (
	"errors"
	"sync"
	"time"

	"url-service/models"
)

// URLStorage defines the interface for URL storage operations
// This interface allows easy extension to other storage backends (Redis, PostgreSQL, etc.)
type URLStorage interface {
	Save(url *models.URL) error
	FindByShortCode(shortCode string) (*models.URL, error)
	FindAll() ([]*models.URL, error)
	Exists(shortCode string) bool
}

// MemoryStorage implements URLStorage using an in-memory map
type MemoryStorage struct {
	mu   sync.RWMutex
	urls map[string]*models.URL
}

// NewMemoryStorage creates a new in-memory storage instance
func NewMemoryStorage() *MemoryStorage {
	return &MemoryStorage{
		urls: make(map[string]*models.URL),
	}
}

// Save stores a URL in memory
func (s *MemoryStorage) Save(url *models.URL) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if url.CreatedAt.IsZero() {
		url.CreatedAt = time.Now()
	}

	s.urls[url.ShortCode] = url
	return nil
}

// FindByShortCode retrieves a URL by its short code
func (s *MemoryStorage) FindByShortCode(shortCode string) (*models.URL, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	url, exists := s.urls[shortCode]
	if !exists {
		return nil, errors.New("url not found")
	}

	return url, nil
}

// FindAll retrieves all stored URLs
func (s *MemoryStorage) FindAll() ([]*models.URL, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	urls := make([]*models.URL, 0, len(s.urls))
	for _, url := range s.urls {
		urls = append(urls, url)
	}

	return urls, nil
}

// Exists checks if a short code already exists
func (s *MemoryStorage) Exists(shortCode string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()

	_, exists := s.urls[shortCode]
	return exists
}
