import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Employee } from '../types';
import { uploadEmployeePhoto } from '../services/supabase';
import { convertFileToWebP } from '../services/imageConverter';
import { 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  Trash2, 
  Check, 
  User,
  FileText,
  History,
  Calendar as CalendarIcon,
  Target,
  ListChecks,
  Upload,
  Download,
  X,
  Plus,
  Mail,
  Phone,
  Linkedin,
  Instagram,
  Twitter,
  Award,
  Cake,
  Clock
} from 'lucide-react';

interface CustomDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  format: 'DMY' | 'YMD';
  placeholder: string;
  isDarkMode: boolean;
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  format,
  placeholder,
  isDarkMode
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const getInitialDate = () => {
    if (!value) return new Date();
    if (format === 'DMY') {
      const parts = value.split('/');
      if (parts.length === 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        const date = new Date(y, m, d);
        if (!isNaN(date.getTime())) return date;
      }
    } else {
      const parts = value.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        const date = new Date(y, m, d);
        if (!isNaN(date.getTime())) return date;
      }
    }
    return new Date();
  };

  const [navDate, setNavDate] = useState<Date>(getInitialDate());

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputClick = () => {
    if (!value) {
      const today = new Date();
      const formatted = format === 'DMY' 
        ? `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`
        : `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      onChange(formatted);
      setNavDate(today);
    } else {
      setNavDate(getInitialDate());
    }
    setIsOpen(true);
  };

  const handleSelectDay = (day: number) => {
    const selectedDate = new Date(navDate.getFullYear(), navDate.getMonth(), day);
    const formatted = format === 'DMY' 
      ? `${String(selectedDate.getDate()).padStart(2, '0')}/${String(selectedDate.getMonth() + 1).padStart(2, '0')}/${selectedDate.getFullYear()}`
      : `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    onChange(formatted);
    setIsOpen(false);
  };

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNavDate(new Date(navDate.getFullYear(), navDate.getMonth() - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNavDate(new Date(navDate.getFullYear(), navDate.getMonth() + 1, 1));
  };

  const handlePrevYear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNavDate(new Date(navDate.getFullYear() - 1, navDate.getMonth(), 1));
  };

  const handleNextYear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNavDate(new Date(navDate.getFullYear() + 1, navDate.getMonth(), 1));
  };

  const year = navDate.getFullYear();
  const month = navDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const blanks = Array(firstDayIndex).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const calendarCells = [...blanks, ...days];

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative flex items-center">
        <input
          readOnly
          value={value}
          onClick={handleInputClick}
          placeholder={placeholder}
          className={`w-full rounded-lg pl-6 pr-12 py-4 text-lg outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer ${isDarkMode ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-gray-100 text-gray-850 hover:bg-gray-200'}`}
        />
        <CalendarIcon size={20} className={`absolute right-4 pointer-events-none ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
      </div>

      {isOpen && (
        <div className={`absolute z-50 mt-2 p-4 rounded-2xl shadow-2xl border w-[320px] left-0 md:left-auto md:right-0 ${isDarkMode ? 'bg-[#1e1e1e] border-white/10 text-white' : 'bg-white border-gray-200 text-gray-800'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1">
              <button type="button" onClick={handlePrevYear} className={`p-1 rounded-md ${isDarkMode ? 'hover:bg-white/5 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`} title="Ano Anterior">
                &laquo;
              </button>
              <button type="button" onClick={handlePrevMonth} className={`p-1 rounded-md ${isDarkMode ? 'hover:bg-white/5 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`} title="Mês Anterior">
                <ChevronLeft size={16} />
              </button>
            </div>
            
            <span className="font-bold text-sm tracking-wider">
              {monthNames[month]} {year}
            </span>

            <div className="flex items-center gap-1">
              <button type="button" onClick={handleNextMonth} className={`p-1 rounded-md ${isDarkMode ? 'hover:bg-white/5 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`} title="Próximo Mês">
                <ChevronRight size={16} />
              </button>
              <button type="button" onClick={handleNextYear} className={`p-1 rounded-md ${isDarkMode ? 'hover:bg-white/5 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`} title="Próximo Ano">
                &raquo;
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {daysOfWeek.map(d => (
              <span key={d} className="text-[10px] font-bold text-gray-400 uppercase">
                {d}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((day, index) => {
              if (day === null) {
                return <div key={`blank-${index}`} className="aspect-square" />;
              }
              
              const isSelected = value && (() => {
                const cur = getInitialDate();
                return cur.getDate() === day && cur.getMonth() === month && cur.getFullYear() === year;
              })();

              const isToday = (() => {
                const t = new Date();
                return t.getDate() === day && t.getMonth() === month && t.getFullYear() === year;
              })();

              return (
                <button
                  type="button"
                  key={`day-${day}`}
                  onClick={() => handleSelectDay(day)}
                  className={`aspect-square rounded-lg text-xs font-semibold flex items-center justify-center transition-all ${
                    isSelected 
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' 
                      : isToday 
                        ? (isDarkMode ? 'bg-white/10 text-cyan-400 border border-cyan-500/30' : 'bg-blue-50 text-blue-600 border border-blue-200')
                        : (isDarkMode ? 'hover:bg-white/5 text-gray-200' : 'hover:bg-gray-100 text-gray-700')
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/5 flex justify-end">
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                const formatted = format === 'DMY' 
                  ? `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`
                  : `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                onChange(formatted);
                setIsOpen(false);
              }}
              className="text-xs font-bold text-blue-500 hover:underline"
            >
              Hoje
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  isDarkMode: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Selecione...',
  isDarkMode
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full rounded-lg px-6 py-4 text-lg outline-none focus:ring-2 focus:ring-blue-500/20 transition-all flex items-center justify-between cursor-pointer ${isDarkMode ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown size={18} className={`transition-transform duration-250 ${isOpen ? 'rotate-180' : ''} ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
      </button>

      {isOpen && (
        <div className={`absolute z-50 mt-2 py-2 rounded-xl shadow-2xl border w-full left-0 max-h-60 overflow-y-auto custom-scrollbar ${isDarkMode ? 'bg-[#1e1e1e] border-white/10 text-white' : 'bg-white border-gray-200 text-gray-800'}`}>
          {options.length === 0 ? (
            <div className="px-6 py-3 text-sm text-gray-400">Nenhuma opção disponível</div>
          ) : (
            options.map(opt => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-6 py-3 text-base font-medium transition-all ${
                    isSelected 
                      ? (isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600')
                      : (isDarkMode ? 'hover:bg-white/5 text-gray-200' : 'hover:bg-gray-50 text-gray-700')
                  }`}
                >
                  {opt.label}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

interface EmployeeEditorProps {
  employee: Employee;
  allEmployees?: Employee[];
  onSave: (id: string, updates: Partial<Employee>) => void;
  onCancel: () => void;
  onDelete: (id: string) => void;
  isDarkMode?: boolean;
}

const MOODS = ['😄', '😊', '😐', '😔', '😡', '❤️', '👍', '☕', '⚡', '⭐'];

type Tab = 'PROFILE' | 'ONBOARDING';

export const EmployeeEditor: React.FC<EmployeeEditorProps> = ({
  employee,
  allEmployees = [],
  onSave,
  onCancel,
  onDelete,
  isDarkMode = false
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('PROFILE');
  const [newTaskText, setNewTaskText] = useState('');
  const [newSkillText, setNewSkillText] = useState('');
  
  const [formData, setFormData] = useState<Partial<Employee>>({
    name: employee.name,
    role: employee.role,
    admissionDate: employee.admissionDate,
    birthDate: employee.birthDate || '', 
    photoUrl: employee.photoUrl,
    description: employee.description || '',
    socials: employee.socials || { linkedin: '', instagram: '', twitter: '', email: '', phone: '', skills: [] },
    department: employee.department || '',
    status: employee.status || 'Active',
    managerId: employee.managerId || '',
    onboardingChecklist: employee.onboardingChecklist || [
        { id: '1', task: 'Criar e-mail corporativo', completed: false },
        { id: '2', task: 'Configurar acesso ao Slack', completed: false },
        { id: '3', task: 'Entregar computador', completed: false },
        { id: '4', task: 'Apresentação da equipe', completed: false },
    ]
  });

  const [age, setAge] = useState<number | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (formData.birthDate) {
      const birth = new Date(formData.birthDate);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        calculatedAge--;
      }
      setAge(calculatedAge);
    } else {
        setAge(null);
    }
  }, [formData.birthDate]);

  const handleChange = (field: keyof Employee, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSocialChange = (platform: 'linkedin' | 'instagram' | 'twitter', value: string) => {
    setFormData(prev => ({
      ...prev,
      socials: { ...prev.socials, [platform]: value }
    }));
  };

  const handleSocialFieldChange = (field: 'linkedin' | 'instagram' | 'twitter' | 'email' | 'phone', value: string) => {
    setFormData(prev => {
      const currentSocials = prev.socials || { linkedin: '', instagram: '', twitter: '', email: '', phone: '', skills: [] };
      return {
        ...prev,
        socials: {
          ...currentSocials,
          [field]: value
        }
      };
    });
  };

  const handleAddSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (!trimmed) return;
    setFormData(prev => {
      const currentSocials = prev.socials || { linkedin: '', instagram: '', twitter: '', email: '', phone: '', skills: [] };
      const currentSkills = currentSocials.skills || [];
      if (currentSkills.includes(trimmed)) return prev;
      return {
        ...prev,
        socials: {
          ...currentSocials,
          skills: [...currentSkills, trimmed]
        }
      };
    });
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setFormData(prev => {
      const currentSocials = prev.socials || { linkedin: '', instagram: '', twitter: '', email: '', phone: '', skills: [] };
      const currentSkills = currentSocials.skills || [];
      return {
        ...prev,
        socials: {
          ...currentSocials,
          skills: currentSkills.filter(s => s !== skillToRemove)
        }
      };
    });
  };

  const handleSave = () => {
    onSave(employee.id, formData);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      let file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 10 * 1024 * 1024) {
          alert("O arquivo deve ter no máximo 10MB.");
          return;
      }

      setIsUploadingPhoto(true);
      try {
          try {
              const webpFile = await convertFileToWebP(file);
              file = webpFile;
          } catch (convErr) {
              console.error("Erro ao converter para WebP, enviando formato original:", convErr);
          }
          const url = await uploadEmployeePhoto(file, employee.id);
          handleChange('photoUrl', url);
      } catch (error) {
          console.error("Erro ao fazer upload da foto:", error);
          alert("Erro ao fazer upload da foto. Tente novamente.");
      } finally {
          setIsUploadingPhoto(false);
          if (fileInputRef.current) {
              fileInputRef.current.value = '';
          }
      }
  };

  const handlePhotoUrlPrompt = () => {
      const url = prompt("Ou insira o link (URL) da imagem:", formData.photoUrl);
      if (url) handleChange('photoUrl', url);
  };

  const renderTabContent = () => {
      switch (activeTab) {
          case 'ONBOARDING': {
              const checklist = formData.onboardingChecklist || [];
              const totalTasks = checklist.length;
              const completedTasks = checklist.filter(t => t.completed).length;
              const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

              const handleToggleTask = (idx: number) => {
                  const newChecklist = [...checklist];
                  newChecklist[idx].completed = !newChecklist[idx].completed;
                  setFormData({ ...formData, onboardingChecklist: newChecklist });
              };

              const handleAddTask = () => {
                  if (!newTaskText.trim()) return;
                  const newTask = {
                      id: Math.random().toString(36).substring(2),
                      task: newTaskText.trim(),
                      completed: false
                  };
                  setFormData({
                      ...formData,
                      onboardingChecklist: [...checklist, newTask]
                  });
                  setNewTaskText('');
              };

              const handleDeleteTask = (id: string) => {
                  setFormData({
                      ...formData,
                      onboardingChecklist: checklist.filter(item => item.id !== id)
                  });
              };

              return (
                  <div className={`p-8 rounded-2xl shadow-sm min-h-[400px] ${isDarkMode ? 'bg-[#1e1e1e] text-white' : 'bg-white text-gray-900'}`}>
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                          <div>
                              <h3 className="text-xl font-bold flex items-center gap-2">
                                  <ListChecks className="text-green-500" /> Checklist de Onboarding
                              </h3>
                              <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  Acompanhe e configure as etapas de integração do colaborador
                              </p>
                          </div>
                          
                          {/* Progress Indicator */}
                          <div className="flex items-center gap-3 w-full md:w-auto">
                              <span className="text-sm font-bold shrink-0">{progressPercentage}%</span>
                              <div className={`w-32 md:w-48 h-3 rounded-full overflow-hidden ${isDarkMode ? 'bg-white/10' : 'bg-gray-100'}`}>
                                  <div 
                                      className="h-full bg-green-500 transition-all duration-500 ease-out"
                                      style={{ width: `${progressPercentage}%` }}
                                  />
                              </div>
                          </div>
                      </div>

                      {/* Add New Task Input */}
                      <div className="flex gap-2 mb-6">
                          <input 
                              type="text"
                              value={newTaskText}
                              onChange={(e) => setNewTaskText(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                              placeholder="Adicionar nova tarefa ao onboarding..."
                              className={`flex-1 rounded-xl px-4 py-3 text-sm outline-none border transition-all ${isDarkMode ? 'bg-white/5 text-white border-white/10 focus:border-green-500/50' : 'bg-gray-50 text-gray-800 border-gray-200 focus:border-green-500/50'}`}
                          />
                          <button 
                              onClick={handleAddTask}
                              className="px-5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-md shadow-green-500/10 cursor-pointer"
                          >
                              <Plus size={16} /> Adicionar
                          </button>
                      </div>

                      {/* Checklist Tasks */}
                      <div className="space-y-3">
                          {checklist.length === 0 ? (
                              <div className={`text-center py-12 rounded-xl border border-dashed ${isDarkMode ? 'border-white/10 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
                                  Nenhuma tarefa registrada para onboarding. Adicione acima!
                              </div>
                          ) : (
                              checklist.map((item, idx) => (
                                  <div 
                                      key={item.id} 
                                      className={`flex items-center gap-4 p-4 rounded-xl border transition-all group ${
                                          item.completed 
                                              ? (isDarkMode ? 'bg-green-900/10 border-green-900/30' : 'bg-green-50 border-green-100') 
                                              : (isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200')
                                      }`}
                                  >
                                      <div 
                                          onClick={() => handleToggleTask(idx)}
                                          className={`w-6 h-6 rounded-md border-2 flex items-center justify-center cursor-pointer transition-colors ${
                                              item.completed 
                                                  ? 'bg-green-500 border-green-500 text-white' 
                                                  : (isDarkMode ? 'border-white/30 hover:border-white/50' : 'border-gray-300 hover:border-gray-400')
                                          }`}
                                      >
                                          {item.completed && <Check size={14} />}
                                      </div>
                                      
                                      <span 
                                          className={`flex-1 font-medium text-sm transition-all ${
                                              item.completed 
                                                  ? (isDarkMode ? 'text-gray-500 line-through' : 'text-gray-400 line-through') 
                                                  : (isDarkMode ? 'text-white' : 'text-gray-900')
                                          }`}
                                      >
                                          {item.task}
                                      </span>

                                      {/* Delete Button */}
                                      <button 
                                          onClick={() => handleDeleteTask(item.id)}
                                          className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer"
                                          title="Excluir tarefa"
                                      >
                                          <Trash2 size={16} />
                                      </button>
                                  </div>
                              ))
                          )}
                      </div>
                  </div>
              );
          }
          default: {
              const statusOptions = [
                { value: 'Active', label: 'Ativo' },
                { value: 'Inactive', label: 'Inativo' },
                { value: 'On Leave', label: 'Licença' }
              ];

              const gestorOptions = [
                { value: '', label: 'Selecione...' },
                ...allEmployees.filter(e => e.id !== employee.id).map(emp => ({
                  value: emp.id,
                  label: emp.name
                }))
              ];

              // Helper to calculate time at company
              const getTenureInfo = () => {
                  if (!formData.admissionDate) return null;
                  try {
                      let date: Date;
                      if (formData.admissionDate.includes('/')) {
                          const [d, m, y] = formData.admissionDate.split('/');
                          date = new Date(`${y}-${m}-${d}`);
                      } else {
                          date = new Date(formData.admissionDate);
                      }
                      if (isNaN(date.getTime())) return null;
                      
                      const today = new Date();
                      let years = today.getFullYear() - date.getFullYear();
                      let months = today.getMonth() - date.getMonth();
                      if (months < 0 || (months === 0 && today.getDate() < date.getDate())) {
                          years--;
                          months = 12 + months;
                      }
                      
                      let text = '';
                      if (years > 0) {
                          text += `${years} ${years === 1 ? 'ano' : 'anos'}`;
                      }
                      if (months > 0) {
                          if (years > 0) text += ' e ';
                          text += `${months} ${months === 1 ? 'mês' : 'meses'}`;
                      }
                      if (years === 0 && months === 0) {
                          text = 'Iniciando hoje!';
                      }

                      // Badge selection
                      let badge = { label: '🌱 Estreante', color: 'bg-teal-500/10 text-teal-500 border-teal-500/20' };
                      if (years >= 5) {
                          badge = { label: '🏆 Ouro (5+ anos)', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' };
                      } else if (years >= 3) {
                          badge = { label: '🥈 Prata (3+ anos)', color: 'bg-slate-400/10 text-slate-400 border-slate-400/20' };
                      } else if (years >= 1) {
                          badge = { label: '🥉 Bronze (1+ ano)', color: 'bg-amber-600/10 text-amber-600 border-amber-600/20' };
                      }

                      return { text, badge };
                  } catch (e) {
                      return null;
                  }
              };

              // Helper to calculate days to birthdate
              const getBirthdayCountdownText = () => {
                  if (!formData.birthDate) return null;
                  try {
                      let birth: Date;
                      if (formData.birthDate.includes('/')) {
                          const [d, m, y] = formData.birthDate.split('/');
                          birth = new Date(`${y}-${m}-${d}`);
                      } else {
                          birth = new Date(formData.birthDate);
                      }
                      if (isNaN(birth.getTime())) return null;
                      
                      const today = new Date();
                      const nextBirth = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
                      if (nextBirth.getTime() < today.getTime() && !(nextBirth.getDate() === today.getDate() && nextBirth.getMonth() === today.getMonth())) {
                          nextBirth.setFullYear(today.getFullYear() + 1);
                      }
                      
                      nextBirth.setHours(0,0,0,0);
                      const todayZero = new Date();
                      todayZero.setHours(0,0,0,0);
                      
                      const diffTime = nextBirth.getTime() - todayZero.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      
                      if (diffDays === 0 || (today.getDate() === birth.getDate() && today.getMonth() === birth.getMonth())) {
                          return 'Hoje é o seu aniversário! 🥳🎉';
                      }
                      return `${diffDays} ${diffDays === 1 ? 'dia' : 'dias'} restantes`;
                  } catch (e) {
                      return null;
                  }
              };

              const tenureInfo = getTenureInfo();
              const birthdayCountdown = getBirthdayCountdownText();
              const currentSocials = formData.socials || { linkedin: '', instagram: '', twitter: '', email: '', phone: '', skills: [] };
              const skillsList = currentSocials.skills || [];
              const suggestedSkills = ['React', 'Node.js', 'UI/UX', 'Figma', 'Marketing', 'Vendas', 'Suporte', 'Python', 'Finanças', 'Gestão'];

              return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-min">
                      {/* Header Block: name + role together as a single identity card, instead of an isolated hero-sized name field */}
                      <div className={`md:col-span-3 p-8 shadow-sm rounded-2xl ${isDarkMode ? 'bg-[#1e1e1e]' : 'bg-white'}`}>
                          <textarea
                              value={formData.name}
                              onChange={(e) => handleChange('name', e.target.value)}
                              className={`text-3xl font-bold outline-none w-full bg-transparent tracking-tight resize-none overflow-hidden leading-tight ${isDarkMode ? 'text-white placeholder:text-gray-600' : 'text-gray-900 placeholder:text-gray-300'}`}
                              placeholder="NOME"
                              rows={1}
                          />
                          <input
                              value={formData.role}
                              onChange={(e) => handleChange('role', e.target.value)}
                              className={`mt-1 text-base font-medium outline-none w-full bg-transparent ${isDarkMode ? 'text-gray-400 placeholder:text-gray-600' : 'text-gray-500 placeholder:text-gray-300'}`}
                              placeholder="Cargo"
                          />
                      </div>

                      {/* Details Block */}
                      <div className={`md:col-span-2 p-8 shadow-sm flex flex-col gap-5 rounded-2xl ${isDarkMode ? 'bg-[#1e1e1e]' : 'bg-white'}`}>
                          <h4 className={`text-base font-bold flex items-center gap-2 border-b pb-3 ${isDarkMode ? 'text-white border-white/10' : 'text-gray-900 border-gray-100'}`}>
                              <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500"><User size={16} /></span> Detalhes
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                              <div>
                                  <label className={`block text-xs font-bold mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Departamento:</label>
                                  <input
                                      value={formData.department || ''}
                                      onChange={(e) => handleChange('department', e.target.value)}
                                      className={`w-full rounded-lg px-4 py-3 text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 text-white border border-white/5 focus:border-blue-500/50' : 'bg-gray-50 text-gray-800 border-gray-200 focus:border-blue-500/50'}`}
                                      placeholder="Department"
                                  />
                              </div>
                              <div>
                                  <label className={`block text-xs font-bold mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Status:</label>
                                  <CustomSelect
                                      value={formData.status || 'Active'}
                                      onChange={(val) => handleChange('status', val)}
                                      options={statusOptions}
                                      isDarkMode={isDarkMode}
                                  />
                              </div>
                              <div>
                                  <label className={`block text-xs font-bold mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Gestor:</label>
                                  <CustomSelect
                                      value={formData.managerId || ''}
                                      onChange={(val) => handleChange('managerId', val)}
                                      options={gestorOptions}
                                      isDarkMode={isDarkMode}
                                  />
                              </div>
                              <div>
                                  <label className={`block text-xs font-bold mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Data de Entrada:</label>
                                  <CustomDatePicker
                                      value={formData.admissionDate || ''}
                                      onChange={(val) => handleChange('admissionDate', val)}
                                      format="DMY"
                                      placeholder="DD/MM/YYYY"
                                      isDarkMode={isDarkMode}
                                  />
                              </div>
                              <div>
                                  <label className={`block text-xs font-bold mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Data de Nascimento:</label>
                                  <CustomDatePicker
                                      value={formData.birthDate || ''}
                                      onChange={(val) => handleChange('birthDate', val)}
                                      format="YMD"
                                      placeholder="YYYY-MM-DD"
                                      isDarkMode={isDarkMode}
                                  />
                              </div>
                          </div>
                      </div>

                      {/* Age Block: same card language as Details, just a compact stat instead of a dominating 9xl number */}
                      <div className={`p-8 shadow-sm flex flex-col gap-5 rounded-2xl ${isDarkMode ? 'bg-[#1e1e1e]' : 'bg-white'}`}>
                          <h4 className={`text-base font-bold flex items-center gap-2 border-b pb-3 ${isDarkMode ? 'text-white border-white/10' : 'text-gray-900 border-gray-100'}`}>
                              <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-500"><CalendarIcon size={16} /></span> Idade
                          </h4>
                          <div className="flex-1 flex items-center justify-center">
                              <div className={`text-6xl font-medium tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {age !== null ? age : '--'}
                              </div>
                          </div>
                      </div>

                      {/* Description Block */}
                      <div className={`md:col-span-3 p-8 shadow-sm flex flex-col gap-4 rounded-2xl ${isDarkMode ? 'bg-[#1e1e1e]' : 'bg-white'}`}>
                          <h4 className={`text-base font-bold flex items-center gap-2 border-b pb-3 ${isDarkMode ? 'text-white border-white/10' : 'text-gray-900 border-gray-100'}`}>
                              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500"><FileText size={16} /></span> Sobre
                          </h4>
                          <textarea
                              value={formData.description}
                              onChange={(e) => handleChange('description', e.target.value)}
                              className={`w-full resize-none bg-transparent outline-none text-sm leading-relaxed ${isDarkMode ? 'text-gray-300 placeholder:text-gray-600' : 'text-gray-600 placeholder:text-gray-300'}`}
                              placeholder="Escreva uma breve descrição sobre o funcionário..."
                              rows={3}
                          />
                      </div>

                      {/* Contatos & Redes Sociais */}
                      <div className={`md:col-span-2 p-8 shadow-sm flex flex-col justify-center gap-6 min-h-[200px] rounded-2xl ${isDarkMode ? 'bg-[#1e1e1e]' : 'bg-white'}`}>
                          <h4 className={`text-base font-bold flex items-center gap-2 border-b pb-3 ${isDarkMode ? 'text-white border-white/10' : 'text-gray-900 border-gray-100'}`}>
                              <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500"><Phone size={16} /></span> Contatos & Redes Sociais
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                              <div>
                                  <label className={`block text-xs font-bold mb-2 flex items-center gap-1.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                      <Mail size={14} /> E-mail Corporativo
                                  </label>
                                  <input 
                                      type="email"
                                      value={currentSocials.email || ''}
                                      onChange={(e) => handleSocialFieldChange('email', e.target.value)}
                                      className={`w-full rounded-lg px-4 py-3 text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 text-white border border-white/5 focus:border-blue-500/50' : 'bg-gray-50 text-gray-800 border-gray-200 focus:border-blue-500/50'}`}
                                      placeholder="nome@empresa.com"
                                  />
                              </div>
                              <div>
                                  <label className={`block text-xs font-bold mb-2 flex items-center gap-1.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                      <Phone size={14} /> Telefone
                                  </label>
                                  <input 
                                      type="tel"
                                      value={currentSocials.phone || ''}
                                      onChange={(e) => handleSocialFieldChange('phone', e.target.value)}
                                      className={`w-full rounded-lg px-4 py-3 text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 text-white border border-white/5 focus:border-blue-500/50' : 'bg-gray-50 text-gray-800 border-gray-200 focus:border-blue-500/50'}`}
                                      placeholder="(00) 00000-0000"
                                  />
                              </div>
                              <div>
                                  <label className={`block text-xs font-bold mb-2 flex items-center gap-1.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                      <Linkedin size={14} /> LinkedIn
                                  </label>
                                  <input 
                                      type="text"
                                      value={currentSocials.linkedin || ''}
                                      onChange={(e) => handleSocialFieldChange('linkedin', e.target.value)}
                                      className={`w-full rounded-lg px-4 py-3 text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 text-white border border-white/5 focus:border-blue-500/50' : 'bg-gray-50 text-gray-800 border-gray-200 focus:border-blue-500/50'}`}
                                      placeholder="linkedin.com/in/usuario"
                                  />
                              </div>
                              <div>
                                  <label className={`block text-xs font-bold mb-2 flex items-center gap-1.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                      <Instagram size={14} /> Instagram
                                  </label>
                                  <input 
                                      type="text"
                                      value={currentSocials.instagram || ''}
                                      onChange={(e) => handleSocialFieldChange('instagram', e.target.value)}
                                      className={`w-full rounded-lg px-4 py-3 text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 text-white border border-white/5 focus:border-blue-500/50' : 'bg-gray-50 text-gray-800 border-gray-200 focus:border-blue-500/50'}`}
                                      placeholder="@usuario"
                                  />
                              </div>
                          </div>
                      </div>

                      {/* Marcos & Datas */}
                      <div className={`p-8 shadow-sm flex flex-col justify-start gap-4 min-h-[200px] rounded-2xl ${isDarkMode ? 'bg-[#1e1e1e]' : 'bg-white'}`}>
                          <h4 className={`text-base font-bold flex items-center gap-2 border-b pb-3 ${isDarkMode ? 'text-white border-white/10' : 'text-gray-900 border-gray-100'}`}>
                              <span className="p-1.5 rounded-lg bg-yellow-500/10 text-yellow-500"><Award size={16} /></span> Marcos & Datas
                          </h4>
                          
                          {/* Tenure Indicator */}
                          {tenureInfo ? (
                              <div className="flex flex-col gap-1.5">
                                  <span className={`text-xs font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Tempo de Casa:</span>
                                  <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                                          {tenureInfo.text}
                                      </span>
                                      <span className={`text-xs px-2.5 py-1 rounded-full border font-bold ${tenureInfo.badge.color}`}>
                                          {tenureInfo.badge.label}
                                      </span>
                                  </div>
                              </div>
                          ) : (
                              <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                  Preencha a Data de Entrada para ver o tempo de casa.
                              </div>
                          )}

                          {/* Birthday countdown */}
                          {birthdayCountdown && (
                              <div className="flex flex-col gap-1.5 mt-2">
                                  <span className={`text-xs font-bold flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                      <Cake size={13} /> Contagem de Aniversário:
                                  </span>
                                  <span className={`text-sm font-semibold text-green-500 flex items-center gap-1.5`}>
                                      {birthdayCountdown}
                                  </span>
                              </div>
                          )}
                      </div>

                      {/* Competências & Habilidades */}
                      <div className={`md:col-span-3 p-8 shadow-sm flex flex-col gap-5 rounded-2xl ${isDarkMode ? 'bg-[#1e1e1e]' : 'bg-white'}`}>
                          <h4 className={`text-base font-bold flex items-center gap-2 border-b pb-3 ${isDarkMode ? 'text-white border-white/10' : 'text-gray-900 border-gray-100'}`}>
                              <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500"><Target size={16} /></span> Competências & Habilidades
                          </h4>
                          
                          {/* Add skill input */}
                          <div className="flex gap-2">
                              <input 
                                  type="text"
                                  value={newSkillText}
                                  onChange={(e) => setNewSkillText(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && (handleAddSkill(newSkillText), setNewSkillText(''))}
                                  placeholder="Nova habilidade..."
                                  className={`flex-1 rounded-lg px-3.5 py-2 text-xs outline-none transition-all ${isDarkMode ? 'bg-white/5 text-white border border-white/10 focus:border-purple-500/50' : 'bg-gray-50 text-gray-800 border-gray-200 focus:border-purple-500/50'}`}
                              />
                              <button 
                                  onClick={() => { handleAddSkill(newSkillText); setNewSkillText(''); }}
                                  className="p-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                              >
                                  <Plus size={16} />
                              </button>
                          </div>

                          {/* Render skills chips */}
                          <div className="flex flex-wrap gap-2">
                              {skillsList.length === 0 ? (
                                  <div className={`text-xs py-4 text-center w-full ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                      Nenhuma habilidade adicionada. Use o campo acima ou clique abaixo para sugerir.
                                  </div>
                              ) : (
                                  skillsList.map((skill) => (
                                      <div 
                                          key={skill} 
                                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                                              isDarkMode 
                                                  ? 'bg-purple-500/5 text-purple-300 border-purple-500/20 hover:bg-purple-500/15' 
                                                  : 'bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100'
                                          }`}
                                      >
                                          <span>{skill}</span>
                                          <button 
                                              onClick={() => handleRemoveSkill(skill)}
                                              className="text-purple-400 hover:text-purple-600 transition-colors cursor-pointer"
                                          >
                                              <X size={12} />
                                          </button>
                                      </div>
                                  ))
                              )}
                          </div>

                          {/* Quick suggestions */}
                          <div className="flex flex-col gap-2 mt-2">
                              <span className={`text-xs font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Sugestões rápidas:</span>
                              <div className="flex flex-wrap gap-1.5">
                                  {suggestedSkills.filter(s => !skillsList.includes(s)).slice(0, 5).map(s => (
                                      <button
                                          key={s}
                                          onClick={() => handleAddSkill(s)}
                                          className={`px-2.5 py-1 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                                              isDarkMode 
                                                  ? 'border-white/10 text-gray-400 hover:bg-white/5 hover:text-white' 
                                                  : 'border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                                          }`}
                                      >
                                          + {s}
                                      </button>
                                  ))}
                              </div>
                          </div>
                      </div>
                  </div>
              );
          }
      }
  };

  return (
    <div className={`fixed inset-x-0 bottom-0 top-[72px] z-50 flex flex-col animate-in slide-in-from-bottom-10 duration-300 ${isDarkMode ? 'bg-[#121212]' : 'bg-gray-100'}`}>
      
      {/* Back Arrow - Floating */}
      <div className="absolute top-6 left-8 z-10">
        <button 
            onClick={onCancel} 
            className={`p-3 rounded-full shadow-md transition-all hover:scale-105 ${isDarkMode ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        >
          <ChevronLeft size={32} />
        </button>
      </div>

      {/* Main Content */}
      <div className={`flex-1 overflow-y-auto flex justify-center custom-scrollbar ${isDarkMode ? 'bg-[#121212]' : 'bg-gray-100'}`}>
        <div className="w-full max-w-7xl p-8 pt-20 pb-12"> {/* Added pt-20 for top spacing */}
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            
            {/* Left Column: Photo, Socials, Actions */}
            <div className="md:col-span-3 flex flex-col gap-6">
                {/* Photo — a single rounded + overflow-hidden clipping context (no nested
                    padding-div-in-div). Two nested rounded corners at slightly different radii
                    is a common source of corner rendering artifacts (visible notches/seams),
                    so this collapses it to one: the gradient lives on the container background
                    (shows through behind the photo / in the no-photo placeholder state), and the
                    border is a plain, non-gradient ring. */}
                <div
                    className={`aspect-square relative group rounded-3xl shadow-xl overflow-hidden border ${isDarkMode ? 'border-white/10 bg-gradient-to-br from-cyan-500 to-purple-700' : 'border-gray-200 bg-gradient-to-br from-blue-500 to-purple-600'}`}
                >
                    {formData.photoUrl ? (
                        <img src={formData.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/50">
                            <User size={80} />
                        </div>
                    )}

                    {/* New Employee Tag */}
                    {(() => {
                        if (!formData.admissionDate) return null;
                        try {
                            let date: Date;
                            if (formData.admissionDate.includes('/')) {
                                const [day, month, year] = formData.admissionDate.split('/');
                                date = new Date(`${year}-${month}-${day}`);
                            } else {
                                date = new Date(formData.admissionDate);
                            }

                            const diffTime = Math.abs(new Date().getTime() - date.getTime());
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                            if (diffDays <= 15) {
                                return (
                                    <div className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md z-10">
                                        NOVO
                                    </div>
                                );
                            }
                        } catch (e) {
                            return null;
                        }
                        return null;
                    })()}

                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center z-20 gap-3">
                        {isUploadingPhoto ? (
                            <span className="text-white font-bold text-sm">Enviando...</span>
                        ) : (
                            <>
                                <label className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm px-5 py-2.5 rounded-full transition-colors shadow-lg">
                                    Fazer Upload
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        ref={fileInputRef}
                                        onChange={handlePhotoUpload}
                                    />
                                </label>
                                <button
                                    onClick={handlePhotoUrlPrompt}
                                    className="text-white font-bold text-xs hover:underline"
                                >
                                    Usar Link (URL)
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Navigation Tabs (Vertical on Desktop) */}
                <div className={`flex flex-col gap-1 p-1.5 rounded-2xl ${isDarkMode ? 'bg-white/5' : 'bg-gray-200/60'}`}>
                    {[
                        { id: 'PROFILE', label: 'Perfil', icon: User },
                        { id: 'ONBOARDING', label: 'Onboarding', icon: ListChecks },
                    ].map(tab => (
                        <motion.button
                            key={tab.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            onClick={() => setActiveTab(tab.id as Tab)}
                            className={`relative flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === tab.id ? 'text-white' : (isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900')}`}
                        >
                            {activeTab === tab.id && (
                                <motion.div
                                    layoutId="editorTabIndicator"
                                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 shadow-lg"
                                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                />
                            )}
                            <tab.icon size={18} className="relative z-10" />
                            <span className="relative z-10">{tab.label}</span>
                        </motion.button>
                    ))}
                </div>

                {/* Actions */}
                <div className="flex gap-3 justify-start mt-2">
                    <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.96 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        onClick={() => onDelete(employee.id)}
                        className="w-full py-3.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white flex items-center justify-center shadow-sm transition-colors rounded-2xl gap-2 font-bold"
                    >
                        <Trash2 size={18} /> Excluir
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.96 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        onClick={handleSave}
                        className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-purple-600 hover:opacity-90 text-white flex items-center justify-center shadow-lg shadow-purple-500/20 transition-opacity rounded-2xl gap-2 font-bold"
                    >
                        <Check size={18} /> Salvar
                    </motion.button>
                </div>
            </div>

            {/* Right Column: Content Grid */}
            <div className="md:col-span-9">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                    >
                        {renderTabContent()}
                    </motion.div>
                </AnimatePresence>
            </div>
            </div>
        </div>
      </div>
    </div>
  );
};
