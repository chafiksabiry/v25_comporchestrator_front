import React, { useState } from 'react';
import { Search, FileText, Video, BookOpen, HelpCircle, Clock } from 'lucide-react';
import { KnowledgeBaseItem } from '../../types';
import { useKnowledgeBase } from '../../hooks/useKnowledgeBase';

interface KnowledgeBaseProps {
  items: KnowledgeBaseItem[];
}

export default function KnowledgeBase({ items }: KnowledgeBaseProps) {
  const {
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
    getRecommendations
  } = useKnowledgeBase(items);
  
  const [selectedItem, setSelectedItem] = useState<KnowledgeBaseItem | null>(null);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'document':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'video':
        return <Video className="h-5 w-5 text-red-500" />;
      case 'guide':
        return <BookOpen className="h-5 w-5 text-green-500" />;
      case 'faq':
        return <HelpCircle className="h-5 w-5 text-purple-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'document':
        return 'bg-blue-100 text-blue-800';
      case 'video':
        return 'bg-red-100 text-red-800';
      case 'guide':
        return 'bg-green-100 text-green-800';
      case 'faq':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleItemClick = (item: KnowledgeBaseItem) => {
    viewItem(item.id);
    setSelectedItem(item);
  };

  const handleRating = (itemId: string, rating: number) => {
    rateItem(itemId, rating);
  };

  if (selectedItem) {
    const recommendations = getRecommendations(selectedItem.id);
    
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setSelectedItem(null)}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Knowledge Base
          </button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              {getTypeIcon(selectedItem.type)}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{selectedItem.title}</h1>
                <p className="text-gray-600">{selectedItem.description}</p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(selectedItem.type)}`}>
              {selectedItem.type.charAt(0).toUpperCase() + selectedItem.type.slice(1)}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {selectedItem.tags.map((tag, index) => (
              <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded">
                {tag}
              </span>
            ))}
          </div>

          <div className="prose max-w-none mb-6">
            <p className="text-gray-700 leading-relaxed">
              {selectedItem.aiGeneratedSummary || 'This is the main content of the knowledge base item. In a real implementation, this would contain the full article, video player, or interactive content.'}
            </p>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Rate this content</h3>
              <div className="text-sm text-gray-600">
                Current rating: {selectedItem.helpfulnessRating.toFixed(1)}/5.0
              </div>
            </div>
            
            <div className="flex space-x-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  onClick={() => handleRating(selectedItem.id, rating)}
                  className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  {rating} ⭐
                </button>
              ))}
            </div>
          </div>
        </div>

        {recommendations.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Related Content</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recommendations.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow cursor-pointer"
                >
                  <div className="flex items-center space-x-2 mb-2">
                    {getTypeIcon(item.type)}
                    <span className="font-medium text-gray-900">{item.title}</span>
                  </div>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
        <div className="text-sm text-gray-600">
          {filteredItems.length} resources available
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search documentation, videos, guides..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'relevance' | 'date' | 'popularity')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="relevance">Sort by Relevance</option>
            <option value="date">Sort by Date</option>
            <option value="popularity">Sort by Popularity</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => handleItemClick(item)}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  {getTypeIcon(item.type)}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(item.type)}`}>
                    {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                  </span>
                </div>
                <span className="text-xs text-gray-500">{item.category}</span>
              </div>

              <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-sm text-gray-600 mb-3">{item.description}</p>

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3 text-gray-400" />
                  <span className="text-xs text-gray-500">Updated {item.lastUpdated}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mb-3">
                {item.tags.slice(0, 3).map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                  >
                    {tag}
                  </span>
                ))}
                {item.tags.length > 3 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                    +{item.tags.length - 3}
                  </span>
                )}
              </div>

              <button className="w-full bg-blue-50 text-blue-600 hover:bg-blue-100 py-2 px-4 rounded-lg text-sm font-medium transition-colors">
                View Resource
              </button>
            </div>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <HelpCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No resources found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}