'use client';

import React, { useState, useEffect } from 'react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

export default function HROrgHierarchy() {
  const [topLevels, setTopLevels] = useState([]);
  const [departmentBranches, setDepartmentBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWorkforceData = async () => {
    try {
      const res = await fetch('/api/workforce', { cache: 'no-store' });
      const result = await res.json();
      
      if (result?.success) {
        const rows = Array.isArray(result.data) ? result.data : (result.data?.results || []);
        
        let topLevelsData = {
          chairman: [],
          ceo: [],
          directors: []
        };

        let deptData = {};

        rows.filter(row => row.active).forEach(row => {
          const designation = (row.designation || '').toLowerCase().trim();
          let deptName = (row.department || '').trim();
          if (!deptName) deptName = 'General';

          const memberObj = {
            initials: (row.full_name || '??').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
            name: row.full_name || '',
            email: row.email || '',
            photo: row.profile_photo_url || null,
            designation: row.designation || 'Team Member'
          };

          if (designation.includes('chairman') || designation.includes('superuser') || designation.includes('super user')) {
            topLevelsData.chairman.push(memberObj);
          } else if (designation.includes('ceo')) {
            topLevelsData.ceo.push(memberObj);
          } else if (designation.includes('director')) {
            topLevelsData.directors.push(memberObj);
          } else {
            if (!deptData[deptName]) {
              deptData[deptName] = { heads: [], managers: [], associates: [], interns: [] };
            }
            if (designation.includes('head') || designation.includes('vp') || designation.includes('chief') || designation.includes('president')) {
              deptData[deptName].heads.push(memberObj);
            } else if (designation.includes('manager') || designation.includes('lead')) {
              deptData[deptName].managers.push(memberObj);
            } else if (designation.includes('intern')) {
              deptData[deptName].interns.push(memberObj);
            } else {
              deptData[deptName].associates.push(memberObj);
            }
          }
        });

        const sortByName = (a, b) => a.name.localeCompare(b.name);
        Object.values(topLevelsData).forEach(arr => arr.sort(sortByName));

        const getTitle = (nodes, defaultTitle) => {
          if (nodes.length === 1 && nodes[0].designation) return nodes[0].designation;
          return defaultTitle;
        };

        const newTopLevels = [
          { id: 'chairman', title: getTitle(topLevelsData.chairman, 'Chairman'), colorClass: 'border-[#4F46E5] text-[#4F46E5]', bgClass: 'bg-indigo-50', arrowColor: 'fill-[#0F172A]', nodes: topLevelsData.chairman },
          { id: 'ceo', title: getTitle(topLevelsData.ceo, 'CEO'), colorClass: 'border-[#3B82F6] text-[#3B82F6]', bgClass: 'bg-blue-50', arrowColor: 'fill-[#0F172A]', nodes: topLevelsData.ceo },
          { id: 'directors', title: getTitle(topLevelsData.directors, 'Directors'), colorClass: 'border-[#06B6D4] text-[#06B6D4]', bgClass: 'bg-cyan-50', arrowColor: 'fill-[#0F172A]', nodes: topLevelsData.directors },
        ].filter(level => level.nodes.length > 0);

        const newDeptBranches = Object.keys(deptData).sort().map(deptKey => {
          const d = deptData[deptKey];
          Object.values(d).forEach(arr => arr.sort(sortByName));
          
          const levels = [
            { id: 'heads', title: getTitle(d.heads, 'Department Heads'), colorClass: 'border-[#10B981] text-[#10B981]', bgClass: 'bg-emerald-50', arrowColor: 'fill-[#0F172A]', nodes: d.heads },
            { id: 'managers', title: getTitle(d.managers, 'Managers'), colorClass: 'border-[#F59E0B] text-[#F59E0B]', bgClass: 'bg-amber-50', arrowColor: 'fill-[#0F172A]', nodes: d.managers },
            { id: 'associates', title: getTitle(d.associates, 'Associates / Team'), colorClass: 'border-gray-500 text-gray-700', bgClass: 'bg-gray-100', arrowColor: 'fill-[#0F172A]', nodes: d.associates },
            { id: 'interns', title: getTitle(d.interns, 'Interns'), colorClass: 'border-[#8B5CF6] text-[#8B5CF6]', bgClass: 'bg-purple-50', arrowColor: 'fill-[#0F172A]', nodes: d.interns },
          ].filter(level => level.nodes.length > 0);

          return { name: deptKey, levels };
        }).filter(dept => dept.levels.length > 0);

        setTopLevels(newTopLevels);
        setDepartmentBranches(newDeptBranches);
      }
    } catch (err) {
      console.error("Error fetching workforce", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkforceData();
    const intervalId = setInterval(() => {
      fetchWorkforceData();
    }, 5000); // 5 seconds auto-refresh
    
    return () => clearInterval(intervalId);
  }, []);

  if (loading && topLevels.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#F3F4F6]">
        <div className="w-8 h-8 border-4 border-[#3B82F6] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const renderLevelNodes = (level) => (
    <div className={`flex justify-center gap-6 w-auto ${level.nodes.length > 1 ? 'min-w-[300px]' : ''} relative px-0`}>
      {level.nodes.length > 1 && <div className="absolute top-0 left-7 right-7 h-px bg-gray-400"></div>}
      
      {level.nodes.map((node, nodeIdx) => (
        <div key={nodeIdx} className="flex flex-col items-center z-10 w-14 shrink-0">
          {level.nodes.length > 1 && <div className="w-px h-6 bg-gray-400"></div>}
          
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={`w-14 h-14 rounded-full border ${level.colorClass.split(' ')[0]} flex items-center justify-center font-bold bg-white shadow-sm hover:shadow-md hover:border-[#0F172A] cursor-pointer transition-all text-[15px] overflow-hidden`}>
                {node.photo ? (
                  <img src={node.photo} alt={node.name} className="w-full h-full object-cover rounded-full" />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${level.bgClass} ${level.colorClass.split(' ')[1]}`}>
                    {node.initials}
                  </div>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent 
              side="top" 
              sideOffset={8}
              className="bg-[#0F172A] border-[#0F172A] text-white p-3 rounded-lg shadow-xl"
            >
              <div className="flex flex-col text-left">
                <span className="text-gray-400 text-[11px] leading-tight mb-1">{node.designation}</span>
                <span className="font-semibold text-[13px] leading-tight mb-1 text-white">{node.name}</span>
                {node.email && <span className="text-gray-300 text-[11px] leading-tight">{node.email}</span>}
              </div>
              <TooltipPrimitive.Arrow className={level.arrowColor} width={12} height={6} />
            </TooltipContent>
          </Tooltip>
        </div>
      ))}
    </div>
  );

  return (
    <TooltipProvider delayDuration={100}>
      <div className="p-4 md:p-6 lg:p-8 h-full w-full overflow-y-auto bg-[#F3F4F6]">
        <div className="bg-white rounded-lg border border-soft-border shadow-sm p-8 min-h-[600px] w-full flex flex-col items-center overflow-x-auto">
          <div className="min-w-max flex flex-col items-center py-4">
            
            {/* 1. TOP LEVELS (Company Wide) */}
            {topLevels.map((level, levelIdx) => (
              <React.Fragment key={level.id}>
                {levelIdx > 0 && <div className="w-px h-8 bg-gray-400"></div>}
                <div className={`border ${level.colorClass} text-[13px] font-medium px-4 py-1 rounded-full bg-white z-10 whitespace-nowrap`}>
                  {level.title} ({level.nodes.length})
                </div>
                <div className="w-px h-6 bg-gray-400"></div>
                {renderLevelNodes(level)}
              </React.Fragment>
            ))}

            {/* 2. DEPARTMENT BRANCHES */}
            {departmentBranches.length > 0 && (
              <>
                <div className="w-px h-12 bg-gray-400"></div>
                
                <div className="flex justify-center items-start w-auto min-w-max">
                  {departmentBranches.map((dept, idx) => {
                    const isFirst = idx === 0;
                    const isLast = idx === departmentBranches.length - 1;
                    const isOnly = departmentBranches.length === 1;

                    return (
                      <div key={dept.name} className="flex flex-col items-center relative px-8 pb-8 shrink-0">
                        {/* Horizontal branch line */}
                        {!isOnly && (
                          <div className={`absolute top-0 h-px bg-gray-400 z-0
                            ${isFirst ? 'left-[50%] right-0' : ''}
                            ${isLast ? 'left-0 right-[50%]' : ''}
                            ${!isFirst && !isLast ? 'left-0 right-0' : ''}
                          `}></div>
                        )}

                        {/* Drop down to department title */}
                        <div className="w-px h-8 bg-gray-400 z-10"></div>
                        
                        <div className="border-2 border-[#1E293B] text-[#1E293B] font-bold px-6 py-2 rounded-lg bg-white shadow-md z-10 mb-6 text-sm uppercase tracking-wider">
                          {dept.name}
                        </div>

                        {/* Department Internal Levels */}
                        {dept.levels.map((level, levelIdx) => (
                          <React.Fragment key={level.id}>
                            {levelIdx > 0 && <div className="w-px h-8 bg-gray-400"></div>}
                            <div className={`border ${level.colorClass} text-[12px] font-medium px-3 py-1 rounded-full bg-white z-10 whitespace-nowrap`}>
                              {level.title} ({level.nodes.length})
                            </div>
                            <div className="w-px h-6 bg-gray-400"></div>
                            {renderLevelNodes(level)}
                          </React.Fragment>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
