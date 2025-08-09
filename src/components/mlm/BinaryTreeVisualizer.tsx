import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Users, TrendingUp, Award, Eye, Plus, Minus, ChevronDown, ChevronUp,
  Maximize2, Grid3X3, List, RotateCcw, Search, Filter, ChevronRight
} from 'lucide-react';
import { BinaryTreeManager, TreeNode } from '../../utils/binaryTreeUtils';

interface BinaryTreeVisualizerProps {
  userId: string;
  treeData: TreeNode[];
  onNodeClick?: (node: TreeNode) => void;
  showStats?: boolean;
}

type ViewMode = 'compact' | 'detailed' | 'virtual' | 'breadth-first';
type NavigationMode = 'expand-collapse' | 'pagination' | 'infinite-scroll';

interface NodeWithParent extends TreeNode {
  parentUserId?: string;
  parentName?: string;
}

const BinaryTreeVisualizer: React.FC<BinaryTreeVisualizerProps> = ({
                                                                     userId,
                                                                     treeData,
                                                                     onNodeClick,
                                                                     showStats = true
                                                                   }) => {
  const [treeManager] = useState(() => new BinaryTreeManager(treeData));
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('compact');
  const [navigationMode, setNavigationMode] = useState<NavigationMode>('expand-collapse');

  // Enhanced state for unlimited levels
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(0);
  const [nodesPerPage] = useState(50);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<number | null>(null);
  const [maxVisibleLevels, setMaxVisibleLevels] = useState(5);
  const [loadedLevels, setLoadedLevels] = useState(new Set<number>([0, 1, 2]));
  const [actualMaxDepth, setActualMaxDepth] = useState(0);
  const [allLevelsData, setAllLevelsData] = useState<Map<number, NodeWithParent[]>>(new Map());

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const virtualScrollRef = useRef<HTMLDivElement>(null);

  // Calculate actual max depth and pre-compute all levels
  const calculateTreeData = useCallback(() => {
    const levelData = new Map<number, NodeWithParent[]>();
    let maxDepth = 0;

    const queue: { node: TreeNode, level: number, parent?: TreeNode }[] = [
      { node: treeManager.getUserPosition(userId)!, level: 0 }
    ];

    while (queue.length > 0) {
      const { node, level, parent } = queue.shift()!;

      if (!node) continue;

      maxDepth = Math.max(maxDepth, level);

      // Add node to level data
      if (!levelData.has(level)) {
        levelData.set(level, []);
      }

      const nodeWithParent: NodeWithParent = {
        ...node,
        parentUserId: parent?.userId,
        parentName: parent?.userData?.firstName || 'Root'
      };

      levelData.get(level)!.push(nodeWithParent);

      // Add children to queue
      const children = treeManager.getDirectChildren(node.userId);
      if (children.left) {
        queue.push({ node: children.left, level: level + 1, parent: node });
      }
      if (children.right) {
        queue.push({ node: children.right, level: level + 1, parent: node });
      }
    }

    setAllLevelsData(levelData);
    setActualMaxDepth(maxDepth);
    return { levelData, maxDepth };
  }, [treeManager, userId]);

  useEffect(() => {
    treeManager.loadTree(treeData);
    const userNode = treeManager.getUserPosition(userId);

    if (userNode) {
      calculateTreeData();

      // Auto-expand first few levels
      const initialExpanded = new Set<string>();
      const addInitialNodes = (node: TreeNode | null, level: number) => {
        if (!node || level > 2) return;
        initialExpanded.add(node.userId);
        const children = treeManager.getDirectChildren(node.userId);
        if (children.left) addInitialNodes(children.left, level + 1);
        if (children.right) addInitialNodes(children.right, level + 1);
      };
      addInitialNodes(userNode, 0);
      setExpandedNodes(initialExpanded);
    }
  }, [treeData, treeManager, userId, calculateTreeData]);

  const userNode = treeManager.getUserPosition(userId);
  const stats = treeManager.getTreeStats(userId);

  // Enhanced node expansion logic
  const toggleNodeExpansion = useCallback((nodeId: string, level: number) => {
    setExpandedNodes(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(nodeId)) {
        newExpanded.delete(nodeId);
      } else {
        newExpanded.add(nodeId);
        // Ensure next levels are loaded when expanding
        setLoadedLevels(prevLevels => {
          const newLevels = new Set(prevLevels);
          newLevels.add(level + 1);
          newLevels.add(level + 2);
          return newLevels;
        });
      }
      return newExpanded;
    });
  }, []);

  // Load more levels on demand - FIXED VERSION
  const loadMoreLevels = useCallback(() => {
    const maxCurrentLevel = Math.max(...Array.from(loadedLevels));
    const levelsToLoad = Math.min(3, actualMaxDepth - maxCurrentLevel);

    if (levelsToLoad <= 0) return;

    setLoadedLevels(prevLevels => {
      const newLevels = new Set(prevLevels);
      for (let i = maxCurrentLevel + 1; i <= maxCurrentLevel + levelsToLoad; i++) {
        if (i <= actualMaxDepth) {
          newLevels.add(i);
        }
      }
      return newLevels;
    });

    setMaxVisibleLevels(prev => Math.min(actualMaxDepth + 1, prev + levelsToLoad));
  }, [loadedLevels, actualMaxDepth]);

  // Get nodes at specific level from pre-computed data
  const getNodesAtLevel = useCallback((level: number): NodeWithParent[] => {
    return allLevelsData.get(level) || [];
  }, [allLevelsData]);

  // Check if level exists
  const levelExists = useCallback((level: number): boolean => {
    return allLevelsData.has(level) && allLevelsData.get(level)!.length > 0;
  }, [allLevelsData]);

  // Compact node component for higher levels - enhanced with parent info
  const CompactNode: React.FC<{
    node: NodeWithParent;
    level: number;
    isExpanded: boolean;
    hasChildren: boolean;
  }> = ({ node, level, isExpanded, hasChildren }) => {
    const isSelected = selectedNode?.id === node.id;
    const isCurrentUser = node.userId === userId;

    return (
        <div className="bg-white border rounded-lg hover:shadow-md transition-all duration-200">
          <div className="p-3">
            {/* Parent Information */}
            {level > 0 && node.parentName && (
                <div className="text-xs text-gray-500 mb-2 flex items-center">
              <span className="bg-gray-100 px-2 py-1 rounded-full">
                Under: {node.parentName}
              </span>
                </div>
            )}

            <div className="flex items-center space-x-3">
              {/* Expand/Collapse Button */}
              {hasChildren && (
                  <button
                      onClick={() => toggleNodeExpansion(node.userId, level)}
                      className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
              )}

              {/* Node Info */}
              <div
                  onClick={() => setSelectedNode(node)}
                  className={`flex-1 cursor-pointer p-3 rounded-lg transition-colors ${
                      isCurrentUser ? 'bg-indigo-100 border-2 border-indigo-300' :
                          isSelected ? 'bg-green-100 border-2 border-green-300' :
                              'hover:bg-gray-50 border border-transparent'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isCurrentUser ? 'bg-indigo-500 text-white' :
                            isSelected ? 'bg-green-500 text-white' :
                                'bg-gray-200 text-gray-600'
                    }`}>
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {node.userData?.firstName || 'User'} {node.userData?.lastName || ''}
                      </div>
                      <div className="text-sm text-gray-500">
                        ID: {node.sponsorshipNumber}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    Level {level}
                  </span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        node.position === 'left' ? 'bg-blue-100 text-blue-700' :
                            node.position === 'right' ? 'bg-green-100 text-green-700' :
                                'bg-purple-100 text-purple-700'
                    }`}>
                    {node.position === 'left' ? 'Left' : node.position === 'right' ? 'Right' : 'Root'}
                  </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
    );
  };

  // Enhanced detailed node for lower levels with better children handling
  const DetailedNode: React.FC<{
    node: TreeNode | null;
    position: 'left' | 'right' | 'root';
    level: number;
  }> = ({ node, position, level }) => {
    if (!node || level > maxVisibleLevels) {
      return (
          <div className="flex flex-col items-center flex-shrink-0" style={{ minWidth: '120px' }}>
            <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
              <Plus className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-xs text-gray-500 mt-1">Available</p>
          </div>
      );
    }

    const isSelected = selectedNode?.id === node.id;
    const isCurrentUser = node.userId === userId;
    const nodeChildren = treeManager.getDirectChildren(node.userId);
    const hasChildren = nodeChildren.left || nodeChildren.right;
    const isExpanded = expandedNodes.has(node.userId);

    return (
        <div className="flex flex-col items-center flex-shrink-0" style={{ minWidth: '120px' }}>
          <div
              onClick={() => setSelectedNode(node)}
              className={`relative w-20 h-20 rounded-lg cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                  isCurrentUser ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg' :
                      isSelected ? 'bg-gradient-to-r from-green-500 to-teal-600 text-white shadow-lg' :
                          'bg-white border-2 border-gray-200 hover:border-indigo-300 hover:shadow-md'
              }`}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center p-1">
              <Users className={`h-4 w-4 mb-1 ${
                  isCurrentUser || isSelected ? 'text-white' : 'text-gray-600'
              }`} />
              <p className={`text-xs font-medium text-center leading-tight ${
                  isCurrentUser || isSelected ? 'text-white' : 'text-gray-900'
              }`}>
                {(node.userData?.firstName || 'User').substring(0, 8)}
              </p>
            </div>

            <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                position === 'left' ? 'bg-blue-500 text-white' :
                    position === 'right' ? 'bg-green-500 text-white' :
                        'bg-purple-500 text-white'
            }`}>
              {position === 'left' ? 'L' : position === 'right' ? 'R' : 'R'}
            </div>
          </div>

          {/* Expansion Controls */}
          {hasChildren && level < maxVisibleLevels && (
              <button
                  onClick={() => toggleNodeExpansion(node.userId, level)}
                  className="mt-2 w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
              >
                {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
          )}

          {/* Children (only for loaded levels) */}
          {level < maxVisibleLevels && isExpanded && hasChildren && loadedLevels.has(level + 1) && (
              <div className="mt-4 flex justify-center" style={{ minWidth: '200px' }}>
                <div className="flex items-start" style={{ gap: '40px' }}>
                  {nodeChildren.left && (
                      <div className="flex flex-col items-center">
                        <div className="w-px h-4 bg-gray-300 mb-2"></div>
                        <DetailedNode node={nodeChildren.left} position="left" level={level + 1} />
                      </div>
                  )}
                  {nodeChildren.right && (
                      <div className="flex flex-col items-center">
                        <div className="w-px h-4 bg-gray-300 mb-2"></div>
                        <DetailedNode node={nodeChildren.right} position="right" level={level + 1} />
                      </div>
                  )}
                </div>
              </div>
          )}
        </div>
    );
  };

  // Breadth-first level view - enhanced with better organization
  const LevelView: React.FC<{ level: number }> = ({ level }) => {
    const nodesAtLevel = getNodesAtLevel(level);

    if (nodesAtLevel.length === 0) return null;

    // Group nodes by parent for better organization
    const nodesByParent = nodesAtLevel.reduce((acc, node) => {
      const parentKey = node.parentUserId || 'root';
      if (!acc[parentKey]) {
        acc[parentKey] = [];
      }
      acc[parentKey].push(node);
      return acc;
    }, {} as Record<string, NodeWithParent[]>);

    return (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900 flex items-center">
            <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium mr-3">
              Level {level}
            </span>
              <span className="text-gray-600 text-sm">{nodesAtLevel.length} members</span>
            </h4>
          </div>

          <div className="space-y-6">
            {Object.entries(nodesByParent).map(([parentKey, nodes]) => (
                <div key={parentKey} className="bg-gray-50 rounded-lg p-4">
                  {level > 0 && (
                      <div className="mb-3">
                        <h5 className="text-sm font-medium text-gray-700">
                          Under: {nodes[0]?.parentName || 'Root'}
                        </h5>
                      </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {nodes.map((node, index) => {
                      const children = treeManager.getDirectChildren(node.userId);
                      const hasChildren = children.left || children.right;
                      const isExpanded = expandedNodes.has(node.userId);

                      return (
                          <CompactNode
                              key={`${node.userId}-${index}`}
                              node={node}
                              level={level}
                              isExpanded={isExpanded}
                              hasChildren={hasChildren}
                          />
                      );
                    })}
                  </div>
                </div>
            ))}
          </div>
        </div>
    );
  };

  const renderTreeView = () => {
    const sortedLoadedLevels = Array.from(loadedLevels).sort((a, b) => a - b);
    const maxLoadedLevel = Math.max(...sortedLoadedLevels);
    const hasMoreLevels = maxLoadedLevel < actualMaxDepth;

    switch (viewMode) {
      case 'breadth-first':
        return (
            <div className="space-y-6">
              {sortedLoadedLevels.map(level => (
                  <LevelView key={level} level={level} />
              ))}

              {hasMoreLevels && (
                  <div className="text-center py-6 border-t border-gray-200">
                    <button
                        onClick={loadMoreLevels}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                    >
                      Load More Levels ({maxLoadedLevel + 1} - {Math.min(actualMaxDepth, maxLoadedLevel + 3)})
                    </button>
                    <p className="text-sm text-gray-500 mt-2">
                      Showing {maxLoadedLevel + 1} of {actualMaxDepth + 1} levels
                    </p>
                  </div>
              )}

              {!hasMoreLevels && actualMaxDepth > 0 && (
                  <div className="text-center py-4 text-gray-500">
                    <p>All levels loaded (0 - {actualMaxDepth})</p>
                  </div>
              )}
            </div>
        );

      case 'compact':
        return (
            <div className="space-y-8">
              <DetailedNode node={userNode} position="root" level={0} />

              {/* Show compact level views for levels beyond the tree view */}
              {sortedLoadedLevels.filter(l => l > 2).map(level => (
                  <LevelView key={level} level={level} />
              ))}

              {hasMoreLevels && (
                  <div className="text-center py-6 border-t border-gray-200">
                    <button
                        onClick={loadMoreLevels}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                    >
                      Load More Levels ({maxLoadedLevel + 1} - {Math.min(actualMaxDepth, maxLoadedLevel + 3)})
                    </button>
                    <p className="text-sm text-gray-500 mt-2">
                      Showing {maxLoadedLevel + 1} of {actualMaxDepth + 1} levels
                    </p>
                  </div>
              )}
            </div>
        );

      case 'detailed':
        return (
            <div className="space-y-8">
              <DetailedNode node={userNode} position="root" level={0} />

              {maxVisibleLevels < actualMaxDepth && (
                  <div className="text-center py-6 border-t border-gray-200">
                    <button
                        onClick={() => setMaxVisibleLevels(prev => Math.min(actualMaxDepth + 1, prev + 3))}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                    >
                      Show More Levels in Tree View
                    </button>
                    <p className="text-sm text-gray-500 mt-2">
                      Tree view showing {maxVisibleLevels} of {actualMaxDepth + 1} levels
                    </p>
                  </div>
              )}
            </div>
        );

      default:
        return <DetailedNode node={userNode} position="root" level={0} />;
    }
  };

  if (!userNode) {
    return (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Tree Data</h3>
          <p className="text-gray-600">User not found in the MLM tree.</p>
        </div>
    );
  }

  return (
      <div className="bg-white rounded-xl shadow-sm">
        {/* Enhanced Header with View Controls */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Binary Tree Structure</h3>
              <p className="text-gray-600">Complete MLM network hierarchy - all levels</p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {/* View Mode Selector */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">View:</label>
                <select
                    value={viewMode}
                    onChange={(e) => setViewMode(e.target.value as ViewMode)}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="detailed">Tree View</option>
                  <option value="compact">Hybrid View</option>
                  <option value="breadth-first">Level by Level</option>
                </select>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center space-x-2">
                <button
                    onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))}
                    className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="text-sm font-medium text-gray-700 min-w-[50px] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
                <button
                    onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.1))}
                    className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Reset Button */}
              <button
                  onClick={() => {
                    setZoomLevel(1);
                    setExpandedNodes(new Set([userId]));
                    setSelectedNode(null);
                    setLoadedLevels(new Set([0, 1, 2]));
                    setMaxVisibleLevels(5);
                  }}
                  className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  title="Reset View"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        {showStats && (
            <div className="p-6 bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600">{stats.totalDownline}</div>
                  <div className="text-sm text-gray-600">Total Network</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.leftSideCount}</div>
                  <div className="text-sm text-gray-600">Left Side</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.rightSideCount}</div>
                  <div className="text-sm text-gray-600">Right Side</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{stats.directReferrals}</div>
                  <div className="text-sm text-gray-600">Direct Referrals</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{actualMaxDepth + 1}</div>
                  <div className="text-sm text-gray-600">Total Levels</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{loadedLevels.size}</div>
                  <div className="text-sm text-gray-600">Loaded Levels</div>
                </div>
              </div>
            </div>
        )}

        {/* Tree Visualization */}
        <div className="relative">
          <div
              ref={scrollContainerRef}
              className="p-8 overflow-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200"
              style={{
                minHeight: '500px',
                maxHeight: '800px',
                scrollBehavior: 'smooth'
              }}
          >
            <div
                style={{
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: 'top center',
                  width: 'fit-content',
                  minWidth: '100%'
                }}
            >
              {renderTreeView()}
            </div>
          </div>

          {/* Navigation Helper */}
          <div className="flex items-center justify-center p-3 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Eye className="h-4 w-4" />
                <span>Viewing {loadedLevels.size} levels</span>
              </div>
              <div className="flex items-center space-x-1">
                <Grid3X3 className="h-4 w-4" />
                <span>{expandedNodes.size} nodes expanded</span>
              </div>
              <div className="flex items-center space-x-1">
                <TrendingUp className="h-4 w-4" />
                <span>Max depth: {actualMaxDepth}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Node Details */}
        {selectedNode && (
            <div className="p-6 bg-indigo-50 border-t border-gray-200">
              <h4 className="text-lg font-semibold text-indigo-900 mb-4">Node Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium text-indigo-700">Name</label>
                  <p className="text-gray-900">
                    {selectedNode.userData?.firstName} {selectedNode.userData?.lastName}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-indigo-700">Sponsorship Number</label>
                  <p className="text-gray-900 font-mono">{selectedNode.sponsorshipNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-indigo-700">Level</label>
                  <p className="text-gray-900">{selectedNode.level}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-indigo-700">Position</label>
                  <p className="text-gray-900 capitalize">{selectedNode.position}</p>
                </div>
              </div>
            </div>
        )}
      </div>
  );
};

export default BinaryTreeVisualizer;