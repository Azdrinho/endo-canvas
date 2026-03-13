import React, { useState } from 'react';
import { Employee } from '../types';
import { EmployeeEditor } from './EmployeeEditor';
import { 
  Search, 
  Grid, 
  List, 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  User,
  Briefcase,
  Calendar,
  Clock,
  TrendingUp,
  Download,
  Filter,
  ArrowUpDown,
  ChevronDown,
  Sun,
  Moon
} from 'lucide-react';

interface EmployeeManagerProps {
  employees: Employee[];
  onClose: () => void;
  onUpdateEmployee: (id: string, updates: Partial<Employee>) => void;
  onDeleteEmployee: (id: string) => void;
  onAddEmployee: () => void;
}

const calculateAge = (birthDate: string): number | null => {
  if (!birthDate) return null;
  try {
    let birth: Date;
    if (birthDate.includes('/')) {
      const parts = birthDate.split('/');
      if (parts.length === 3) {
        let [day, month, year] = parts.map(Number);
        if (year < 100) {
          const currentYear = new Date().getFullYear() % 100;
          year += (year > currentYear + 1 ? 1900 : 2000);
        }
        birth = new Date(year, month - 1, day);
      } else {
        return null;
      }
    } else {
      birth = new Date(birthDate);
    }
    
    if (isNaN(birth.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  } catch (e) {
    return null;
  }
};

export const EmployeeManager: React.FC<EmployeeManagerProps> = ({
  employees,
  onClose,
  onUpdateEmployee,
  onDeleteEmployee,
  onAddEmployee
}) => {
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // New State for Sorting and Filtering
  const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'admissionDate'; direction: 'asc' | 'desc' }>({ key: 'admissionDate', direction: 'desc' });
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Derived Data
  const uniqueRoles = Array.from(new Set(employees.map(e => e.role).filter(Boolean))).sort();

  const filteredEmployees = employees
    .filter(emp => {
      const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            emp.role.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'ALL' || emp.role === roleFilter;
      const matchesStatus = statusFilter === 'ALL' || (emp.status || 'Active') === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    })
    .sort((a, b) => {
      if (sortConfig.key === 'name') {
        return sortConfig.direction === 'asc' 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else {
        const parseDate = (d?: string) => {
          if (!d) return 0;
          if (d.includes('/')) {
              const [day, month, year] = d.split('/');
              return new Date(`${year}-${month}-${day}`).getTime();
          }
          return new Date(d).getTime();
        };
        const dateA = parseDate(a.admissionDate);
        const dateB = parseDate(b.admissionDate);
        return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
      }
    });

  const handleExportCSV = () => {
      const headers = ['ID', 'Name', 'Role', 'Department', 'Status', 'Admission', 'Birthday'];
      const csvContent = [
          headers.join(','),
          ...filteredEmployees.map(e => [
              `"${e.id}"`,
              `"${e.name}"`,
              `"${e.role}"`,
              `"${e.department || ''}"`,
              `"${e.status || 'Active'}"`,
              `"${e.admissionDate || ''}"`,
              `"${e.birthDate || e.dateStr || ''}"`
          ].join(','))
      ].join('\n');
  
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `employees_export_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
  };

  const handleSaveEmployee = (id: string, updates: Partial<Employee>) => {
    onUpdateEmployee(id, updates);
    setEditingId(null);
  };

  if (editingId) {
    const employeeToEdit = employees.find(e => e.id === editingId);
    if (employeeToEdit) {
      return (
        <EmployeeEditor 
          employee={employeeToEdit}
          allEmployees={employees}
          onSave={handleSaveEmployee}
          onCancel={() => setEditingId(null)}
          onDelete={(id) => { onDeleteEmployee(id); setEditingId(null); }}
          isDarkMode={isDarkMode}
        />
      );
    }
  }

  return (
    <div className={`fixed inset-0 z-40 flex flex-col pt-[72px] animate-in fade-in duration-500 ${isDarkMode ? 'bg-[#121212]' : 'bg-gray-100'}`}>
      {/* Header / Toolbar */}
      <div className={`px-8 py-6 flex justify-between items-center border-b shadow-sm shrink-0 ${isDarkMode ? 'bg-[#1e1e1e] border-white/10' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${isDarkMode ? 'text-gray-500 group-focus-within:text-cyan-400' : 'text-gray-400 group-focus-within:text-cyan-600'}`} size={18} />
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar funcionários..." 
              className={`pl-10 pr-4 py-2 rounded-full border-transparent focus:ring-2 focus:ring-cyan-500/20 w-64 transition-all outline-none text-sm font-medium ${isDarkMode ? 'bg-white/5 focus:bg-white/10 text-white placeholder:text-gray-600' : 'bg-gray-100 focus:bg-white focus:border-cyan-500 text-gray-700'}`}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 rounded-full transition-all ${isDarkMode ? 'bg-white/10 text-yellow-400 hover:bg-white/20' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <div className={`flex p-1 rounded-lg border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-100 border-gray-200'}`}>
            <button 
              onClick={() => setViewMode('GRID')}
              className={`p-2 rounded-md transition-all ${viewMode === 'GRID' ? (isDarkMode ? 'bg-white/10 shadow-sm text-cyan-400' : 'bg-white shadow-sm text-cyan-600') : (isDarkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600')}`}
            >
              <Grid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('LIST')}
              className={`p-2 rounded-md transition-all ${viewMode === 'LIST' ? (isDarkMode ? 'bg-white/10 shadow-sm text-cyan-400' : 'bg-white shadow-sm text-cyan-600') : (isDarkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600')}`}
            >
              <List size={18} />
            </button>
          </div>

          <button 
            onClick={onClose}
            className={`p-2 rounded-full transition-colors ml-4 ${isDarkMode ? 'hover:bg-white/10 text-gray-500 hover:text-gray-300' : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'}`}
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Filter & Sort Toolbar */}
      <div className={`px-8 py-4 flex flex-wrap gap-4 items-center border-b shrink-0 ${isDarkMode ? 'bg-[#121212] border-white/5' : 'bg-gray-50 border-gray-200'}`}>
          
          {/* Sort Dropdown */}
          <div className="relative group">
              <select 
                  value={`${sortConfig.key}-${sortConfig.direction}`}
                  onChange={(e) => {
                      const [key, direction] = e.target.value.split('-');
                      setSortConfig({ key: key as any, direction: direction as any });
                  }}
                  className={`appearance-none pl-4 pr-10 py-2 rounded-lg text-sm font-medium outline-none border transition-all cursor-pointer ${isDarkMode ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
              >
                  <option value="name-asc" className="text-black">Nome (A-Z)</option>
                  <option value="name-desc" className="text-black">Nome (Z-A)</option>
                  <option value="admissionDate-desc" className="text-black">Mais Recentes</option>
                  <option value="admissionDate-asc" className="text-black">Mais Antigos</option>
              </select>
              <ArrowUpDown size={14} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          </div>

          {/* Role Filter */}
          <div className="relative group">
              <select 
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className={`appearance-none pl-4 pr-10 py-2 rounded-lg text-sm font-medium outline-none border transition-all cursor-pointer ${isDarkMode ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
              >
                  <option value="ALL" className="text-black">Todos os Cargos</option>
                  {uniqueRoles.map(role => (
                      <option key={role} value={role} className="text-black">{role}</option>
                  ))}
              </select>
              <Filter size={14} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          </div>

          {/* Status Filter */}
          <div className="relative group">
              <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`appearance-none pl-4 pr-10 py-2 rounded-lg text-sm font-medium outline-none border transition-all cursor-pointer ${isDarkMode ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
              >
                  <option value="ALL" className="text-black">Todos os Status</option>
                  <option value="Active" className="text-black">Ativo</option>
                  <option value="Inactive" className="text-black">Inativo</option>
                  <option value="On Leave" className="text-black">Licença</option>
              </select>
              <ChevronDown size={14} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          </div>

          <div className="flex-1"></div>

          {/* Export Button */}
          <button 
              onClick={handleExportCSV}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isDarkMode ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'}`}
          >
              <Download size={16} />
              <span>Exportar CSV</span>
          </button>

      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        {viewMode === 'GRID' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {/* Add New Card - Always First */}
            <button 
              onClick={onAddEmployee}
              className="group aspect-square relative overflow-hidden flex flex-col items-center justify-center gap-4 text-white hover:scale-[1.02] transition-all shadow-lg"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 via-purple-500 to-cyan-400 bg-[length:200%_200%] animate-header-gradient opacity-90 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-4 rounded-full bg-white/20 backdrop-blur-sm group-hover:bg-white/30 transition-colors">
                <Plus size={32} />
              </div>
              <span className="relative font-bold text-sm uppercase tracking-wide">Adicionar Novo</span>
            </button>

            {filteredEmployees.map(emp => (
              <div key={emp.id} className={`group rounded-2xl border shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col relative ${isDarkMode ? 'bg-[#1e1e1e] border-white/10 hover:border-cyan-500/50' : 'bg-white border-gray-200 hover:border-cyan-200'}`}>
                {/* Image Area */}
                <div className={`aspect-square relative overflow-hidden ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                  {emp.photoUrl ? (
                    <img src={emp.photoUrl} alt={emp.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center ${isDarkMode ? 'text-white/20' : 'text-gray-300'}`}>
                      <User size={48} />
                    </div>
                  )}
                  
                  {/* Overlay Actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm z-20">
                    <button 
                      onClick={() => setEditingId(emp.id)}
                      className="p-3 bg-white rounded-full text-gray-900 hover:text-cyan-600 hover:scale-110 transition-all shadow-lg"
                      title="Edit"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => onDeleteEmployee(emp.id)}
                      className="p-3 bg-white rounded-full text-red-500 hover:bg-red-50 hover:scale-110 transition-all shadow-lg"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  {/* New Employee Tag */}
                  {(() => {
                      if (!emp.admissionDate) return null;
                      try {
                          let date: Date;
                          if (emp.admissionDate.includes('/')) {
                              const [day, month, year] = emp.admissionDate.split('/');
                              date = new Date(`${year}-${month}-${day}`);
                          } else {
                              date = new Date(emp.admissionDate);
                          }
                          
                          const diffTime = Math.abs(new Date().getTime() - date.getTime());
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                          
                          if (diffDays <= 15) {
                              return (
                                  <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1.5 shadow-md z-10 rounded-bl-xl">
                                      NOVO
                                  </div>
                              );
                          }
                      } catch (e) {
                          return null;
                      }
                      return null;
                  })()}
                </div>

                {/* Info Area */}
                <div className="p-4 flex flex-col gap-1">
                  <h3 className={`font-bold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{emp.name}</h3>
                  <p className={`text-xs uppercase tracking-wide truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{emp.role}</p>
                  
                  <div className={`mt-3 pt-3 border-t flex flex-col gap-1 text-xs ${isDarkMode ? 'border-white/10 text-gray-500' : 'border-gray-100 text-gray-400'}`}>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1"><Calendar size={12}/> {emp.dateStr}</span>
                      {(emp.birthDate || emp.dateStr) && calculateAge(emp.birthDate || emp.dateStr) !== null && (
                        <span className="font-medium text-cyan-500">{calculateAge(emp.birthDate || emp.dateStr)} anos</span>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1"><Clock size={12}/> {emp.tenure || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={`rounded-2xl border shadow-sm overflow-hidden ${isDarkMode ? 'bg-[#1e1e1e] border-white/10' : 'bg-white border-gray-200'}`}>
            <table className={`w-full text-left text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              <thead className={`border-b text-xs uppercase font-bold ${isDarkMode ? 'bg-white/5 border-white/10 text-gray-500' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                <tr>
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Birthday</th>
                  <th className="px-6 py-4">Age</th>
                  <th className="px-6 py-4">Admission</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-100'}`}>
                {filteredEmployees.map(emp => (
                  <tr key={emp.id} className={`transition-colors group ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                    <td className="px-6 py-4 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full overflow-hidden shrink-0 ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`}>
                        {emp.photoUrl && <img src={emp.photoUrl} className="w-full h-full object-cover" />}
                      </div>
                      <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{emp.name}</div>
                    </td>
                    <td className="px-6 py-4">{emp.role}</td>
                    <td className="px-6 py-4">{emp.dateStr}</td>
                    <td className="px-6 py-4">{calculateAge(emp.birthDate || emp.dateStr) || '--'}</td>
                    <td className="px-6 py-4">{emp.admissionDate}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditingId(emp.id)} className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-cyan-500/20 text-cyan-400' : 'hover:bg-cyan-50 text-cyan-600'}`}><Edit2 size={16}/></button>
                        <button onClick={() => onDeleteEmployee(emp.id)} className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-500'}`}><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
