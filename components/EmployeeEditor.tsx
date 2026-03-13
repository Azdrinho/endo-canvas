import React, { useState, useEffect, useRef } from 'react';
import { Employee } from '../types';
import { uploadEmployeePhoto } from '../services/supabase';
import { 
  ChevronLeft, 
  Trash2, 
  Check, 
  User,
  Linkedin,
  Instagram,
  Twitter,
  FileText,
  History,
  Calendar as CalendarIcon,
  Target,
  ListChecks,
  Upload,
  Download,
  X
} from 'lucide-react';

interface EmployeeEditorProps {
  employee: Employee;
  allEmployees?: Employee[]; // Optional for backward compatibility/tests
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
  const [formData, setFormData] = useState<Partial<Employee>>({
    name: employee.name,
    role: employee.role,
    dateStr: employee.dateStr,
    admissionDate: employee.admissionDate,
    birthDate: employee.birthDate || '', 
    photoUrl: employee.photoUrl,
    description: employee.description || '',
    socials: employee.socials || { linkedin: '', instagram: '', twitter: '' },
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
    const calculateAgeFromStr = (dateStr: string): number | null => {
      if (!dateStr) return null;
      try {
        let birth: Date;
        if (dateStr.includes('/')) {
          const parts = dateStr.split('/');
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
          birth = new Date(dateStr);
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

    const calculatedAge = calculateAgeFromStr(formData.birthDate || formData.dateStr || '');
    setAge(calculatedAge);
  }, [formData.birthDate, formData.dateStr]);

  const handleChange = (field: keyof Employee, value: any) => {
    setFormData(prev => {
        const updated = { ...prev, [field]: value };
        if (field === 'birthDate' && value) {
            try {
                const date = new Date(value);
                const day = String(date.getDate() + 1).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                updated.dateStr = `${day}/${month}`;
            } catch (err) {
                console.error("Error syncing dateStr:", err);
            }
        }
        return updated;
    });
  };

  const handleSocialChange = (platform: 'linkedin' | 'instagram' | 'twitter', value: string) => {
    setFormData(prev => ({
      ...prev,
      socials: { ...prev.socials, [platform]: value }
    }));
  };

  const handleSave = () => {
    onSave(employee.id, formData);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
          alert("O arquivo deve ter no máximo 5MB.");
          return;
      }

      setIsUploadingPhoto(true);
      try {
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
          case 'ONBOARDING':
              return (
                  <div className={`p-8 rounded-2xl shadow-sm min-h-[400px] ${isDarkMode ? 'bg-[#1e1e1e]' : 'bg-white'}`}>
                      <h3 className={`text-xl font-bold mb-6 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          <ListChecks className="text-green-500" /> Checklist de Onboarding
                      </h3>
                      <div className="space-y-3">
                          {formData.onboardingChecklist?.map((item, idx) => (
                              <div key={item.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${item.completed ? (isDarkMode ? 'bg-green-900/20 border-green-900/30' : 'bg-green-50 border-green-100') : (isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200')}`}>
                                  <div 
                                      onClick={() => {
                                          const newChecklist = [...(formData.onboardingChecklist || [])];
                                          newChecklist[idx].completed = !newChecklist[idx].completed;
                                          setFormData({...formData, onboardingChecklist: newChecklist});
                                      }}
                                      className={`w-6 h-6 rounded-md border-2 flex items-center justify-center cursor-pointer transition-colors ${item.completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`}
                                  >
                                      {item.completed && <Check size={14} />}
                                  </div>
                                  <span className={`flex-1 font-medium ${item.completed ? 'text-gray-400 line-through' : (isDarkMode ? 'text-white' : 'text-gray-900')}`}>{item.task}</span>
                              </div>
                          ))}
                      </div>
                  </div>
              );
          default:
              return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-min">
                      {/* Name Block */}
                      <div className={`md:col-span-3 p-10 shadow-sm flex flex-col justify-center min-h-[180px] rounded-2xl ${isDarkMode ? 'bg-[#1e1e1e]' : 'bg-white'}`}>
                          <textarea 
                              value={formData.name}
                              onChange={(e) => handleChange('name', e.target.value)}
                              className={`text-5xl lg:text-6xl font-bold uppercase outline-none w-full bg-transparent tracking-tight resize-none overflow-hidden leading-tight ${isDarkMode ? 'text-white placeholder:text-gray-600' : 'text-gray-900 placeholder:text-gray-300'}`}
                              placeholder="NAME"
                              rows={2}
                          />
                      </div>

                      {/* Description Block */}
                      <div className={`md:col-span-3 p-8 shadow-sm flex flex-col gap-4 min-h-[160px] rounded-2xl ${isDarkMode ? 'bg-[#1e1e1e]' : 'bg-white'}`}>
                          <label className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Sobre:</label>
                          <textarea 
                              value={formData.description}
                              onChange={(e) => handleChange('description', e.target.value)}
                              className={`w-full h-full resize-none bg-transparent outline-none text-base leading-relaxed ${isDarkMode ? 'text-gray-300 placeholder:text-gray-600' : 'text-gray-600 placeholder:text-gray-300'}`}
                              placeholder="Escreva uma breve descrição sobre o funcionário..."
                              rows={3}
                          />
                      </div>

                      {/* Details Block */}
                      <div className={`md:col-span-2 p-8 shadow-sm flex flex-col justify-center gap-8 min-h-[200px] rounded-2xl ${isDarkMode ? 'bg-[#1e1e1e]' : 'bg-white'}`}>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                  <label className={`block text-sm font-bold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Cargo:</label>
                                  <input 
                                      value={formData.role}
                                      onChange={(e) => handleChange('role', e.target.value)}
                                      className={`w-full rounded-lg px-6 py-4 text-lg outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${isDarkMode ? 'bg-white/5 text-white' : 'bg-gray-100 text-gray-800'}`}
                                      placeholder="Role"
                                  />
                              </div>
                              <div>
                                  <div className="flex justify-between items-center mb-3">
                                      <label className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Nascimento:</label>
                                      {age !== null && (
                                          <span className="text-[10px] font-bold text-cyan-500 uppercase tracking-wider">{age} ANOS</span>
                                      )}
                                  </div>
                                  <input 
                                      value={formData.dateStr || ''}
                                      onChange={(e) => handleChange('dateStr', e.target.value)}
                                      className={`w-full rounded-lg px-6 py-4 text-lg outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${isDarkMode ? 'bg-white/5 text-white' : 'bg-gray-100 text-gray-800'}`}
                                      placeholder="DD/MM/YY"
                                  />
                              </div>
                              <div>
                                  <label className={`block text-sm font-bold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Data de Entrada:</label>
                                  <input 
                                      value={formData.admissionDate || ''}
                                      onChange={(e) => handleChange('admissionDate', e.target.value)}
                                      className={`w-full rounded-lg px-6 py-4 text-lg outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${isDarkMode ? 'bg-white/5 text-white' : 'bg-gray-100 text-gray-800'}`}
                                      placeholder="DD/MM/YYYY"
                                  />
                              </div>
                              <div>
                                  <label className={`block text-sm font-bold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Departamento:</label>
                                  <input 
                                      value={formData.department || ''}
                                      onChange={(e) => handleChange('department', e.target.value)}
                                      className={`w-full rounded-lg px-6 py-4 text-lg outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${isDarkMode ? 'bg-white/5 text-white' : 'bg-gray-100 text-gray-800'}`}
                                      placeholder="Department"
                                  />
                              </div>
                              <div>
                                  <label className={`block text-sm font-bold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Status:</label>
                                  <select 
                                      value={formData.status || 'Active'}
                                      onChange={(e) => handleChange('status', e.target.value)}
                                      className={`w-full rounded-lg px-6 py-4 text-lg outline-none focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none ${isDarkMode ? 'bg-white/5 text-white' : 'bg-gray-100 text-gray-800'}`}
                                  >
                                      <option value="Active" className="text-black">Ativo</option>
                                      <option value="Inactive" className="text-black">Inativo</option>
                                      <option value="On Leave" className="text-black">Licença</option>
                                  </select>
                              </div>
                              <div>
                                  <label className={`block text-sm font-bold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Gestor:</label>
                                  <select 
                                      value={formData.managerId || ''}
                                      onChange={(e) => handleChange('managerId', e.target.value)}
                                      className={`w-full rounded-lg px-6 py-4 text-lg outline-none focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none ${isDarkMode ? 'bg-white/5 text-white' : 'bg-gray-100 text-gray-800'}`}
                                  >
                                      <option value="" className="text-black">Selecione...</option>
                                      {allEmployees.filter(e => e.id !== employee.id).map(emp => (
                                          <option key={emp.id} value={emp.id} className="text-black">{emp.name}</option>
                                      ))}
                                  </select>
                              </div>
                          </div>

                          {/* Social Media Inputs */}
                          <div className={`flex flex-col md:flex-row gap-4 pt-4 border-t ${isDarkMode ? 'border-white/10' : 'border-gray-100'}`}>
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className={`w-10 h-10 rounded flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                                      <Linkedin size={20} />
                                  </div>
                                  <input 
                                  value={formData.socials?.linkedin || ''}
                                  onChange={(e) => handleSocialChange('linkedin', e.target.value)}
                                  placeholder="LinkedIn"
                                  className={`flex-1 text-sm border-none rounded px-3 py-2 focus:ring-1 focus:ring-blue-500 outline-none transition-all w-full ${isDarkMode ? 'bg-white/5 text-white placeholder:text-white/30' : 'bg-gray-50 text-gray-900'}`}
                                  />
                              </div>
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className={`w-10 h-10 rounded flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-pink-900/30 text-pink-400' : 'bg-pink-50 text-pink-600'}`}>
                                      <Instagram size={20} />
                                  </div>
                                  <input 
                                  value={formData.socials?.instagram || ''}
                                  onChange={(e) => handleSocialChange('instagram', e.target.value)}
                                  placeholder="Instagram"
                                  className={`flex-1 text-sm border-none rounded px-3 py-2 focus:ring-1 focus:ring-pink-500 outline-none transition-all w-full ${isDarkMode ? 'bg-white/5 text-white placeholder:text-white/30' : 'bg-gray-50 text-gray-900'}`}
                                  />
                              </div>
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className={`w-10 h-10 rounded flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-sky-900/30 text-sky-400' : 'bg-sky-50 text-sky-500'}`}>
                                      <Twitter size={20} />
                                  </div>
                                  <input 
                                  value={formData.socials?.twitter || ''}
                                  onChange={(e) => handleSocialChange('twitter', e.target.value)}
                                  placeholder="Twitter"
                                  className={`flex-1 text-sm border-none rounded px-3 py-2 focus:ring-1 focus:ring-sky-500 outline-none transition-all w-full ${isDarkMode ? 'bg-white/5 text-white placeholder:text-white/30' : 'bg-gray-50 text-gray-900'}`}
                                  />
                              </div>
                          </div>
                      </div>

                      {/* Age Block */}
                      <div className={`p-8 shadow-sm flex flex-col items-center justify-center relative min-h-[200px] rounded-2xl ${isDarkMode ? 'bg-[#1e1e1e]' : 'bg-white'}`}>
                          <span className={`absolute top-6 left-6 text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Idade:</span>
                          <div className="flex flex-col items-center w-full">
                              <div className={`text-9xl font-medium tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {age !== null ? age : '--'}
                              </div>
                              <input 
                                  type="text"
                                  value={formData.dateStr || ''}
                                  onChange={(e) => handleChange('dateStr', e.target.value)}
                                  className={`mt-2 text-sm font-bold bg-transparent border-none outline-none text-center uppercase tracking-widest w-full opacity-50 focus:opacity-100 transition-opacity ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                                  placeholder="DD/MM/YY"
                              />
                          </div>
                      </div>
                  </div>
              );
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
                {/* Photo */}
                <div className={`aspect-square p-1 shadow-xl relative group overflow-hidden ${isDarkMode ? 'bg-gradient-to-br from-cyan-600 to-purple-800' : 'bg-gradient-to-br from-blue-500 to-purple-600'}`}>
                    {formData.photoUrl ? (
                        <img src={formData.photoUrl} alt="Profile" className="w-full h-full object-cover scale-[1.02] translate-y-[1px]" />
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
                                    <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 shadow-md z-10">
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
                                <label className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm px-4 py-2 rounded-lg transition-colors">
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
                <div className="flex flex-col gap-2">
                    {[
                        { id: 'PROFILE', label: 'Perfil', icon: User },
                        { id: 'ONBOARDING', label: 'Onboarding', icon: ListChecks },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as Tab)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === tab.id ? (isDarkMode ? 'bg-white text-black' : 'bg-black text-white') : (isDarkMode ? 'text-gray-400 hover:bg-white/5 hover:text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900')}`}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Actions */}
                <div className="flex gap-4 justify-start mt-6">
                    <button 
                        onClick={() => onDelete(employee.id)}
                        className="w-full py-4 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white flex items-center justify-center shadow-sm transition-all rounded-xl gap-2 font-bold"
                    >
                        <Trash2 size={20} /> Excluir
                    </button>
                    <button 
                        onClick={handleSave}
                        className="w-full py-4 bg-green-500 hover:bg-green-600 text-white flex items-center justify-center shadow-lg shadow-green-500/20 transition-all rounded-xl gap-2 font-bold"
                    >
                        <Check size={20} /> Salvar
                    </button>
                </div>
            </div>

            {/* Right Column: Content Grid */}
            <div className="md:col-span-9">
                {renderTabContent()}
            </div>
            </div>
        </div>
      </div>
    </div>
  );
};
