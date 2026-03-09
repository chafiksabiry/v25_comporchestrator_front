import { useState, useCallback, useMemo } from 'react';
import { KnowledgeBaseItem } from '../types';

export const useKnowledgeBase = (items: KnowledgeBaseItem[]) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'popularity'>('relevance');

  const categories = useMemo(() => {
    const cats = ['all', ...Array.from(new Set(items.map(item => item.category)))];
    return cats;
  }, [items]);

  const filteredItems = useMemo(() => {
    let filtered = items.filter(item => {
      const matchesSearch = searchTerm === '' || 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });

    // Sort items
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
        case 'popularity':
          return b.viewCount - a.viewCount;
        case 'relevance':
        default:
          if (searchTerm) {
            return b.aiRelevanceScore - a.aiRelevanceScore;
          }
          return b.helpfulnessRating - a.helpfulnessRating;
      }
    });

    return filtered;
  }, [items, searchTerm, selectedCategory, sortBy]);

  const viewItem = useCallback((itemId: string) => {
    // Increment view count
    const item = items.find(i => i.id === itemId);
    if (item) {
      item.viewCount += 1;
    }
  }, [items]);

  const rateItem = useCallback((itemId: string, rating: number) => {
    // Update helpfulness rating
    const item = items.find(i => i.id === itemId);
    if (item) {
      // Simple average calculation (in real app, would be more sophisticated)
      item.helpfulnessRating = (item.helpfulnessRating + rating) / 2;
    }
  }, [items]);

  const getRecommendations = useCallback((currentItemId: string, limit: number = 3) => {
    const currentItem = items.find(i => i.id === currentItemId);
    if (!currentItem) return [];

    // Find related items based on tags and category
    const related = items
      .filter(item => item.id !== currentItemId)
      .map(item => {
        let score = 0;
        
        // Same category bonus
        if (item.category === currentItem.category) score += 3;
        
        // Shared tags bonus
        const sharedTags = item.tags.filter(tag => currentItem.tags.includes(tag));
        score += sharedTags.length * 2;
        
        // AI relevance score
        score += item.aiRelevanceScore / 20;
        
        return { item, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ item }) => item);

    return related;
  }, [items]);

  return {
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    sortBy,
    setSortBy,
    categories,
    filteredItems,
    viewItem,
    rateItem,
    getRecommendations,
  };
};