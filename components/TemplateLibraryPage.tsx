/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import Spinner from './Spinner';
import { SearchIcon } from './icons';
import { Template } from '../App';
import { TemplateService } from '../services/templateService';


// New component to handle fetching and displaying template image
const TemplateCard: React.FC<{
  template: Template;
  onSelect: (template: Template) => void;
}> = ({ template, onSelect }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleImageLoad = () => {
    setIsLoaded(true);
    setHasError(false);
  };

  const handleImageError = () => {
    setHasError(true);
    setIsLoaded(false);
    console.error(`Failed to load template image: ${template.iconUrl}`);
  };

  return (
    <div
      className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden group transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20 hover:border-blue-500/50 hover:-translate-y-1"
      onClick={() => onSelect(template)}
    >
      <div className="cursor-pointer">
        <div className="aspect-video bg-gray-900 overflow-hidden flex items-center justify-center relative">
          {!isLoaded && !hasError && (
            <Spinner className="w-8 h-8 text-gray-500" />
          )}
          {hasError && (
            <div className="text-gray-500 text-center">
              <span className="text-sm">加载失败</span>
            </div>
          )}
          <img 
            src={template.cover_image_url || template.iconUrl} 
            alt={template.title || template.name} 
            className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
          
          {/* 显示统计信息和标签 */}
          <div className="absolute top-2 right-2 flex flex-col gap-1">
            {template.is_featured && (
              <span className="bg-yellow-500 text-black text-xs px-2 py-1 rounded-full font-bold">
                精选
              </span>
            )}
            {template.stats && (
              <span className="bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                ❤️ {template.stats.like_count}
              </span>
            )}
          </div>
        </div>
        <div className="p-4">
          <h3 className="text-xl font-bold text-white truncate">{template.title || template.name}</h3>
          <p className="text-gray-400 mt-2 text-sm h-16 overflow-hidden text-ellipsis">
            {template.description}
          </p>
          
          {/* 显示标签 */}
          {template.tags && template.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {template.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag.id}
                  className="text-xs px-2 py-1 rounded-full"
                  style={{ 
                    backgroundColor: tag.color + '20', 
                    color: tag.color,
                    border: `1px solid ${tag.color}40`
                  }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
          
          {/* 显示作者信息 */}
          {template.author && (
            <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
              <span>by {template.author.username}</span>
              {template.author.is_creator && (
                <span className="text-blue-400">✓ 认证创作者</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface TemplateLibraryPageProps {
    onTemplateSelect: (template: Template) => void;
}

const ITEMS_PER_PAGE = 9;

const TemplateLibraryPage: React.FC<TemplateLibraryPageProps> = ({ onTemplateSelect }) => {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        const fetchTemplates = async () => {
            setIsLoading(true);
            try {
                const response = await TemplateService.getTemplates({
                    page: currentPage,
                    limit: ITEMS_PER_PAGE,
                    search: searchQuery || undefined,
                    sort: 'popular'
                });
                setTemplates(response.templates);
                setTotalPages(Math.ceil(response.total / ITEMS_PER_PAGE));
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load templates.');
                console.error('Failed to fetch templates:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTemplates();
    }, [currentPage, searchQuery]);

    // Reset page to 1 when search query changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Spinner /></div>;
    }

    if (error) {
        return <div className="text-center text-red-400 bg-red-900/50 p-6 rounded-lg">{error}</div>;
    }

    return (
        <div className="w-full max-w-6xl mx-auto p-4 md:p-8 animate-fade-in">
            <div className="text-center mb-8">
                <h2 className="font-['Caveat'] text-5xl md:text-7xl font-bold text-white tracking-wider">Awesome Nano Banana</h2>
                <p className="text-gray-300 text-lg md:text-xl mt-2">NB提示词模板库</p>
            </div>
            
            {/* Search Bar */}
            <div className="mb-8 w-full max-w-2xl mx-auto">
                <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                        <SearchIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="搜索模板名称或提示词..."
                        className="block w-full rounded-lg border-gray-600 bg-gray-900/50 py-3 pl-11 pr-4 text-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none transition-colors"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {templates.length > 0 ? (
                    templates.map(template => (
                        <TemplateCard
                            key={template.id}
                            template={template}
                            onSelect={onTemplateSelect}
                        />
                    ))
                ) : !isLoading && (
                     <div className="col-span-full text-center py-16">
                        <p className="text-gray-400 text-lg">
                            {searchQuery ? 
                                `找不到匹配 "${searchQuery}" 的模板。` : 
                                '暂无模板数据。'
                            }
                        </p>
                    </div>
                )}
            </div>

            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-12">
                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-4 py-2 bg-gray-700 text-white rounded-lg disabled:opacity-50 transition-colors hover:bg-gray-600"
                    >
                        上一页
                    </button>
                    <span className="text-gray-300">
                        第 {currentPage} 页 / 共 {totalPages} 页
                    </span>
                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 bg-gray-700 text-white rounded-lg disabled:opacity-50 transition-colors hover:bg-gray-600"
                    >
                        下一页
                    </button>
                </div>
            )}
        </div>
    );
};

export default TemplateLibraryPage;