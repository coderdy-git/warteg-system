import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { api } from '../../lib/api';
import { X, Send, Bot, User, Sparkles, AlertCircle, ArrowLeft, Camera, Image as ImageIcon } from 'lucide-react';

interface AIChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onTransactionUpdated?: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageBase64?: string;
}

export const AIChatDrawer: React.FC<AIChatDrawerProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
  onTransactionUpdated,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        'Halo! Saya Asisten AI Keuangan WSystem. Anda bisa tanyakan ringkasan kas, laba bersih, atau kirim foto nota/struk/catatan belanja pasar untuk saya hitungkan totalnya.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Upload Foto di Chat State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [showImagePicker, setShowImagePicker] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Kompresi otomatis di sisi client agar kirim gambar instan & tidak lama
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (event) => {
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 1000;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // Kompresi ke JPEG kualitas 0.7 (ukuran berkurang ~90% jadi ~150KB)
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        setSelectedImage(compressedBase64);
      };
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSend = async (textToSend?: string) => {
    const text = textToSend !== undefined ? textToSend : input;
    if ((!text.trim() && !selectedImage) || loading) return;

    const currentImg = selectedImage;
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text || 'Tolong baca dan rincikan total belanja pada foto ini:',
      imageBase64: currentImg || undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSelectedImage(null);
    setErrorMsg(null);
    setLoading(true);

    try {
      const history = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
        imageBase64: m.imageBase64,
      }));

      const reply = await api.sendChatMessage(history);
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'assistant', content: reply },
      ]);

      // Jika ada pencatatan transaksi yang berhasil, trigger refresh data utama
      if (reply.includes('Berhasil dicatat langsung ke pembukuan kas warteg')) {
        onTransactionUpdated?.();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal berkomunikasi dengan AI.');
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    'Berapa sisa kas tunai di laci?',
    'Total pemasukan & belanja minggu ini?',
    'Bagaimana kondisi laba bersih warteg?',
    'Saran efisiensi belanja bahan?',
  ];

  return (
    <>
      {/* Backdrop overlay untuk desktop */}
      <div
        onClick={onClose}
        className="hidden md:block fixed inset-0 bg-slate-900/20 backdrop-blur-2xs z-40 transition-opacity"
      />

      {/* Main Container: Full Screen di Mobile, Drawer w-96 di Desktop */}
      <div className="fixed inset-0 md:inset-y-0 md:left-auto md:right-0 md:w-96 bg-white md:border-l border-slate-200 shadow-2xl z-50 flex flex-col">
        {/* Header Drawer */}
        <div className="h-14 md:h-16 px-4 md:px-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            {/* Tombol Back khusus Mobile */}
            <button
              onClick={onClose}
              className="md:hidden p-1.5 -ml-1 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Kembali"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm leading-tight">Asisten AI Kas</h3>
              <p className="text-[10px] text-emerald-600 font-medium">DeepSeek Official API</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Tombol Tutup Silang di Desktop */}
            <button
              onClick={onClose}
              className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Area Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/40">
          {messages.map((m) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={m.id}
                className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs shadow-2xs ${
                    isUser
                      ? 'bg-slate-900 text-white'
                      : 'bg-orange-600 text-white font-bold'
                  }`}
                >
                  {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-2xs ${
                    isUser
                      ? 'bg-slate-900 text-white rounded-tr-xs'
                      : 'bg-white text-slate-800 rounded-tl-xs border border-slate-200/70'
                  }`}
                >
                  {/* Foto yang dikirim pengguna jika ada */}
                  {m.imageBase64 && (
                    <div className="mb-2 max-w-[200px] rounded-xl overflow-hidden border border-white/20">
                      <img
                        src={m.imageBase64}
                        alt="Foto Struk"
                        className="w-full h-auto object-cover max-h-48"
                      />
                    </div>
                  )}

                  {isUser ? (
                    m.content
                  ) : (
                    <div className="prose prose-xs max-w-none prose-p:leading-relaxed prose-strong:font-bold prose-strong:text-slate-900">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-orange-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Bot className="w-3.5 h-3.5 animate-pulse" />
              </div>
              <div className="bg-white border border-slate-200/70 rounded-2xl px-3.5 py-2.5 text-xs text-slate-500 rounded-tl-xs flex items-center gap-1.5 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Gagal respons AI</span>
              </div>
              <p className="text-[11px]">{errorMsg}</p>
              <button
                onClick={onOpenSettings}
                className="text-orange-600 underline font-semibold mt-1 inline-block text-[11px]"
              >
                Buka Pengaturan AI →
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts (Swipeable Chips Horisontal di Mobile & Desktop) */}
        <div className="px-3.5 py-2 border-t border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {quickPrompts.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                className="whitespace-nowrap text-[11px] text-slate-600 hover:text-orange-600 hover:bg-orange-50/70 px-2.5 py-1 rounded-full border border-slate-200 active:scale-95 transition-all shrink-0 bg-slate-50/60"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Preview Foto Sebelum Dikirim */}
        {selectedImage && (
          <div className="px-3.5 py-2 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <img
                src={selectedImage}
                alt="Selected"
                className="w-10 h-10 object-cover rounded-lg border border-slate-300"
              />
              <span className="text-[11px] font-semibold text-slate-700">Foto siap dianalisis</span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="p-1 rounded-md text-slate-400 hover:text-rose-600 text-xs"
            >
              ✕ Hapus
            </button>
          </div>
        )}

        {/* Action Sheet Pilihan Foto Kamera / Galeri */}
        {showImagePicker && (
          <div className="p-3 bg-orange-50/70 border-t border-orange-200/60 shrink-0 flex items-center justify-around gap-2">
            <button
              type="button"
              onClick={() => {
                setShowImagePicker(false);
                cameraInputRef.current?.click();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-orange-200 text-slate-800 rounded-xl text-xs font-bold shadow-2xs hover:bg-orange-50 active:scale-95 transition-all"
            >
              <Camera className="w-3.5 h-3.5 text-orange-600" />
              <span>Buka Kamera</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowImagePicker(false);
                galleryInputRef.current?.click();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-orange-200 text-slate-800 rounded-xl text-xs font-bold shadow-2xs hover:bg-orange-50 active:scale-95 transition-all"
            >
              <ImageIcon className="w-3.5 h-3.5 text-slate-700" />
              <span>Pilih Galeri</span>
            </button>
            <button
              type="button"
              onClick={() => setShowImagePicker(false)}
              className="text-xs text-slate-400 hover:text-slate-600 px-2"
            >
              Batal
            </button>
          </div>
        )}

        {/* Input File Kamera & Galeri Tersembunyi */}
        <input
          type="file"
          ref={cameraInputRef}
          onChange={handleImageFile}
          accept="image/*"
          capture="environment"
          className="hidden"
        />
        <input
          type="file"
          ref={galleryInputRef}
          onChange={handleImageFile}
          accept="image/*"
          className="hidden"
        />

        {/* Form Input Pesan */}
        <div className="p-3 border-t border-slate-100 bg-white shrink-0 safe-bottom">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            {/* Tombol Kamera di Form Chat */}
            <button
              type="button"
              onClick={() => setShowImagePicker(!showImagePicker)}
              className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-orange-600 hover:border-orange-300 hover:bg-orange-50 transition-colors shrink-0 shadow-2xs active:scale-95"
              title="Kirim Foto Struk/Catatan Belanja"
            >
              <Camera className="w-4 h-4" />
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={selectedImage ? 'Tulis catatan tambahan (opsional)...' : 'Tanyakan kas atau kirim foto nota...'}
              className="flex-1 px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 bg-slate-50/50 focus:bg-white transition-colors"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || (!input.trim() && !selectedImage)}
              className="p-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50 transition-colors shrink-0 shadow-2xs active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
};
