import React from 'react';
import { FileText, Image, FileAudio, Video, Paperclip } from 'lucide-react';

interface MessageDisplayProps {
  content: string;
  type: string;
  adjunto?: string | null;
  direction: 'sent' | 'received';
}

export const MessageDisplay: React.FC<MessageDisplayProps> = ({ 
  content, 
  type, 
  adjunto, 
  direction 
}) => {
  // Function to determine if a string is a base64 encoded content
  const isBase64 = (str: string): boolean => {
    try {
      // Check if it starts with data URI scheme
      return str.startsWith('data:');
    } catch (e) {
      return false;
    }
  };

  // Function to determine the type of base64 content
  const getBase64Type = (base64String: string): string => {
    if (base64String.startsWith('data:image/')) return 'image';
    if (base64String.startsWith('data:video/')) return 'video';
    if (base64String.startsWith('data:audio/')) return 'audio';
    if (base64String.startsWith('data:application/pdf')) return 'pdf';
    return 'unknown';
  };

  // Render base64 content based on its type
  const renderBase64Content = (base64String: string) => {
    const contentType = getBase64Type(base64String);
    
    switch (contentType) {
      case 'image':
        return (
          <div className="mt-2">
            <img 
              src={base64String} 
              alt="Imagen adjunta" 
              className="max-w-full rounded-lg max-h-60 object-contain"
            />
          </div>
        );
      case 'video':
        return (
          <div className="mt-2">
            <video 
              src={base64String} 
              controls 
              className="max-w-full rounded-lg max-h-60"
            >
              Tu navegador no soporta la reproducción de videos.
            </video>
          </div>
        );
      case 'audio':
        return (
          <div className="mt-2">
            <audio 
              src={base64String} 
              controls 
              className="w-full"
            >
              Tu navegador no soporta la reproducción de audio.
            </audio>
          </div>
        );
      case 'pdf':
        return (
          <div className="mt-2 flex items-center p-2 bg-gray-100 rounded-lg">
            <FileText className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-sm">Documento PDF adjunto</span>
            <a 
              href={base64String} 
              download="documento.pdf"
              className="ml-auto text-blue-600 text-sm hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Ver
            </a>
          </div>
        );
      default:
        return (
          <div className="mt-2 flex items-center p-2 bg-gray-100 rounded-lg">
            <Paperclip className="w-5 h-5 text-gray-500 mr-2" />
            <span className="text-sm">Archivo adjunto</span>
            <a 
              href={base64String} 
              download="archivo"
              className="ml-auto text-blue-600 text-sm hover:underline"
            >
              Descargar
            </a>
          </div>
        );
    }
  };

  // Render attachment based on message type
  const renderAttachment = () => {
    if (!adjunto) return null;
    
    // Check if adjunto is a base64 string
    if (isBase64(adjunto)) {
      return renderBase64Content(adjunto);
    }
    
    // If it's a URL, render based on type
    switch (type) {
      case 'image':
        return (
          <div className="mt-2">
            <img 
              src={adjunto} 
              alt="Imagen adjunta" 
              className="max-w-full rounded-lg max-h-60 object-contain"
            />
          </div>
        );
      case 'video':
        return (
          <div className="mt-2">
            <video 
              src={adjunto} 
              controls 
              className="max-w-full rounded-lg max-h-60"
            >
              Tu navegador no soporta la reproducción de videos.
            </video>
          </div>
        );
      case 'audio':
        return (
          <div className="mt-2">
            <audio 
              src={adjunto} 
              controls 
              className="w-full"
            >
              Tu navegador no soporta la reproducción de audio.
            </audio>
          </div>
        );
      case 'document':
        return (
          <div className="mt-2 flex items-center p-2 bg-gray-100 rounded-lg">
            <FileText className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-sm">Documento adjunto</span>
            <a 
              href={adjunto} 
              download
              className="ml-auto text-blue-600 text-sm hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Descargar
            </a>
          </div>
        );
      default:
        return (
          <div className="mt-2 flex items-center p-2 bg-gray-100 rounded-lg">
            <Paperclip className="w-5 h-5 text-gray-500 mr-2" />
            <span className="text-sm">Archivo adjunto</span>
            <a 
              href={adjunto} 
              download
              className="ml-auto text-blue-600 text-sm hover:underline"
            >
              Descargar
            </a>
          </div>
        );
    }
  };

  // Check if the message content itself is a base64 string
  const contentIsBase64 = isBase64(content);
  
  return (
    <div className={`max-w-[80%] ${direction === 'sent' ? 'ml-auto bg-blue-500 text-white' : 'mr-auto bg-gray-200 text-gray-800'} rounded-lg p-3 mb-2`}>
      {contentIsBase64 ? (
        renderBase64Content(content)
      ) : (
        <p className="whitespace-pre-wrap break-words">{content}</p>
      )}
      
      {renderAttachment()}
    </div>
  );
};