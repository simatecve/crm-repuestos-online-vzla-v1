import React, { useState } from 'react';
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface ImportContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export const ImportContactsModal: React.FC<ImportContactsModalProps> = ({ 
  isOpen, 
  onClose, 
  onImportComplete 
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [importResults, setImportResults] = useState<{
    success: number;
    errors: string[];
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseCSV(selectedFile);
    }
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      const data = lines.slice(1, 6).map(line => {
        const values = line.split(',').map(v => v.trim());
        const obj: any = {};
        headers.forEach((header, index) => {
          obj[header] = values[index] || '';
        });
        return obj;
      }).filter(row => Object.values(row).some(val => val !== ''));

      setPreview(data);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        const contacts = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim());
          const contact: any = {
            name: '',
            email: '',
            phone: '',
            segment: 'general',
            status: 'active',
            tags: []
          };

          headers.forEach((header, index) => {
            const value = values[index] || '';
            switch (header) {
              case 'nombre':
              case 'name':
                contact.name = value;
                break;
              case 'email':
              case 'correo':
                contact.email = value;
                break;
              case 'telefono':
              case 'phone':
              case 'teléfono':
                contact.phone = value;
                break;
              case 'segmento':
              case 'segment':
                contact.segment = value || 'general';
                break;
              case 'estado':
              case 'status':
                contact.status = value || 'active';
                break;
              case 'etiquetas':
              case 'tags':
                contact.tags = value ? value.split(';').map(t => t.trim()) : [];
                break;
            }
          });

          return contact;
        }).filter(contact => contact.name && contact.email);

        let successCount = 0;
        const errors: string[] = [];

        for (const contact of contacts) {
          try {
            const { error } = await supabase
              .from('contacts')
              .insert([contact]);

            if (error) {
              errors.push(`Error al importar ${contact.name}: ${error.message}`);
            } else {
              successCount++;
            }
          } catch (error) {
            errors.push(`Error al importar ${contact.name}: ${error}`);
          }
        }

        setImportResults({ success: successCount, errors });
        
        if (successCount > 0) {
          toast.success(`${successCount} contactos importados correctamente`);
          onImportComplete();
        }

        if (errors.length > 0) {
          toast.error(`${errors.length} errores durante la importación`);
        }

      } catch (error) {
        console.error('Error importing contacts:', error);
        toast.error('Error al procesar el archivo');
      } finally {
        setLoading(false);
      }
    };

    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const csvContent = [
      ['nombre', 'email', 'telefono', 'segmento', 'estado', 'etiquetas'],
      ['Juan Pérez', 'juan@ejemplo.com', '+34 600 000 000', 'premium', 'active', 'cliente;vip'],
      ['María García', 'maria@ejemplo.com', '+34 600 000 001', 'general', 'active', 'prospecto']
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla-contactos.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Importar Contactos</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {!importResults && (
            <>
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">Instrucciones de importación</h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <ul className="list-disc list-inside space-y-1">
                        <li>El archivo debe estar en formato CSV</li>
                        <li>Las columnas deben incluir: nombre, email, telefono, segmento, estado, etiquetas</li>
                        <li>Las etiquetas deben separarse con punto y coma (;)</li>
                        <li>El email es obligatorio para cada contacto</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Download Template */}
              <div className="flex justify-center">
                <button
                  onClick={downloadTemplate}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 flex items-center space-x-2 transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Descargar Plantilla CSV</span>
                </button>
              </div>

              {/* File Upload */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        Selecciona un archivo CSV
                      </span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        accept=".csv"
                        className="sr-only"
                        onChange={handleFileChange}
                      />
                    </label>
                    <p className="mt-1 text-sm text-gray-500">
                      O arrastra y suelta aquí
                    </p>
                  </div>
                </div>
              </div>

              {/* Preview */}
              {preview.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Vista previa (primeras 5 filas)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {Object.keys(preview[0]).map((header) => (
                            <th
                              key={header}
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {preview.map((row, index) => (
                          <tr key={index}>
                            {Object.values(row).map((value: any, cellIndex) => (
                              <td
                                key={cellIndex}
                                className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                              >
                                {value}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Import Results */}
          {importResults && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      Importación completada
                    </h3>
                    <p className="text-sm text-green-700">
                      {importResults.success} contactos importados correctamente
                    </p>
                  </div>
                </div>
              </div>

              {importResults.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        Errores durante la importación
                      </h3>
                      <div className="mt-2 text-sm text-red-700">
                        <ul className="list-disc list-inside space-y-1">
                          {importResults.errors.slice(0, 5).map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                          {importResults.errors.length > 5 && (
                            <li>... y {importResults.errors.length - 5} errores más</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {importResults ? 'Cerrar' : 'Cancelar'}
          </button>
          {!importResults && file && (
            <button
              onClick={handleImport}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2 transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span>Importar Contactos</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};