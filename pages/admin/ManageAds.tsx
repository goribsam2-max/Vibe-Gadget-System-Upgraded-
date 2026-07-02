import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useNotify } from "../../components/Notifications";
import { Save, Plus, Trash2, Image as ImageIcon, Film } from "lucide-react";
import { uploadToImgbb } from "../../services/imgbb";

interface AdMedia {
  url: string;
  ratio: string;
}

interface VideoAdConfig {
  id: string;
  active: boolean;
  videos: AdMedia[];
  timerDuration: number;
  showCloseAfterVideos: number;
}

interface PhotoAdConfig {
  id: string;
  active: boolean;
  images: AdMedia[];
  title: string;
  text: string;
  buttonText: string;
  buttonLink: string;
}

const RATIO_OPTIONS = [
  { label: 'Auto (Original)', value: 'auto' },
  { label: '1:1 (Square)', value: '1/1' },
  { label: '4:3 (Landscape)', value: '4/3' },
  { label: '3:4 (Portrait)', value: '3/4' },
  { label: '16:9 (Widescreen)', value: '16/9' },
  { label: '9:16 (Vertical/Reels)', value: '9/16' },
];

const ManageAds: React.FC = () => {
  const [videoAds, setVideoAds] = useState<VideoAdConfig[]>([]);
  const [photoAds, setPhotoAds] = useState<PhotoAdConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const notify = useNotify();

  useEffect(() => {
    const fetchAds = async () => {
      const snap = await getDoc(doc(db, "settings", "ads"));
      if (snap.exists()) {
        const data = snap.data();
        if (data.videoAds) {
          setVideoAds(data.videoAds);
        } else if (data.videoAd) {
          setVideoAds([{
            id: 'legacy-video',
            active: data.videoAd.active,
            videos: [{ url: data.videoAd.url, ratio: '16/9' }],
            timerDuration: 5,
            showCloseAfterVideos: 1
          }]);
        }
        
        if (data.photoAds) {
          const migrated = data.photoAds.map((ad: any) => ({
            ...ad,
            images: ad.images || (ad.image ? [{ url: ad.image, ratio: '4/3' }] : []),
          }));
          setPhotoAds(migrated);
        }
      }
    };
    fetchAds();
  }, []);

  const saveAds = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, "settings", "ads"), {
        videoAds,
        photoAds
      });
      notify("Ads settings saved", "success");
    } catch (err) {
      notify("Failed to save ads settings", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleMediaUpload = async (file: File) => {
    try {
      const url = await uploadToImgbb(file);
      return url || null;
    } catch (error) {
      notify("Upload failed", "error");
      return null;
    }
  };

  // Video Ads Functions
  const addVideoAd = () => {
    setVideoAds([...videoAds, {
      id: Date.now().toString(),
      active: true,
      videos: [{ url: '', ratio: '16/9' }],
      timerDuration: 5,
      showCloseAfterVideos: 1
    }]);
  };

  const updateVideoAd = (index: number, field: keyof VideoAdConfig, value: any) => {
    const newAds = [...videoAds];
    newAds[index] = { ...newAds[index], [field]: value };
    setVideoAds(newAds);
  };

  const removeVideoAd = (index: number) => {
    const newAds = [...videoAds];
    newAds.splice(index, 1);
    setVideoAds(newAds);
  };

  const addMediaToVideoAd = (adIndex: number) => {
    const newAds = [...videoAds];
    newAds[adIndex].videos.push({ url: '', ratio: '16/9' });
    setVideoAds(newAds);
  };

  const updateVideoMedia = (adIndex: number, mediaIndex: number, field: keyof AdMedia, value: string) => {
    const newAds = [...videoAds];
    newAds[adIndex].videos[mediaIndex] = { ...newAds[adIndex].videos[mediaIndex], [field]: value };
    setVideoAds(newAds);
  };

  const removeVideoMedia = (adIndex: number, mediaIndex: number) => {
    const newAds = [...videoAds];
    newAds[adIndex].videos.splice(mediaIndex, 1);
    setVideoAds(newAds);
  };

  // Photo Ads Functions
  const addPhotoAd = () => {
    setPhotoAds([...photoAds, {
      id: Date.now().toString(),
      active: true,
      images: [{ url: '', ratio: '4/3' }],
      title: "",
      text: "",
      buttonText: "",
      buttonLink: ""
    }]);
  };

  const updatePhotoAd = (index: number, field: keyof PhotoAdConfig, value: any) => {
    const newAds = [...photoAds];
    newAds[index] = { ...newAds[index], [field]: value };
    setPhotoAds(newAds);
  };

  const removePhotoAd = (index: number) => {
    const newAds = [...photoAds];
    newAds.splice(index, 1);
    setPhotoAds(newAds);
  };

  const addMediaToPhotoAd = (adIndex: number) => {
    const newAds = [...photoAds];
    newAds[adIndex].images.push({ url: '', ratio: '4/3' });
    setPhotoAds(newAds);
  };

  const updatePhotoMedia = async (adIndex: number, mediaIndex: number, field: keyof AdMedia, value: string, file?: File) => {
    const newAds = [...photoAds];
    if (file) {
      newAds[adIndex].images[mediaIndex].url = "Uploading...";
      setPhotoAds([...newAds]);
      const url = await handleMediaUpload(file);
      if (url) {
        newAds[adIndex].images[mediaIndex].url = url;
      } else {
        newAds[adIndex].images[mediaIndex].url = "";
      }
    } else {
      newAds[adIndex].images[mediaIndex] = { ...newAds[adIndex].images[mediaIndex], [field]: value };
    }
    setPhotoAds(newAds);
  };

  const removePhotoMedia = (adIndex: number, mediaIndex: number) => {
    const newAds = [...photoAds];
    newAds[adIndex].images.splice(mediaIndex, 1);
    setPhotoAds(newAds);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Manage Promotions & Ads</h2>
        <button 
          onClick={saveAds}
          disabled={loading}
          className="bg-black dark:bg-white text-white dark:text-black px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:opacity-80 disabled:opacity-50"
        >
          {loading ? "Saving..." : <><Save className="w-4 h-4" /> Save All</>}
        </button>
      </div>

      {/* Video Ads Section */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800">
        <div className="flex justify-between items-center mb-4">
           <h3 className="text-xl font-bold">Video Ads</h3>
           <button onClick={addVideoAd} className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-zinc-200">
             <Plus className="w-4 h-4" /> Add Video Ad
           </button>
        </div>
        
        <div className="space-y-6">
          {videoAds.map((ad, adIndex) => (
            <div key={ad.id} className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl relative bg-zinc-50 dark:bg-zinc-800/50">
               <button onClick={() => removeVideoAd(adIndex)} className="absolute top-4 right-4 text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition">
                 <Trash2 className="w-4 h-4" />
               </button>
               
               <div className="flex flex-wrap items-center gap-4 mb-4">
                 <label className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input type="checkbox" className="sr-only" checked={ad.active} onChange={(e) => updateVideoAd(adIndex, "active", e.target.checked)} />
                      <div className={`block w-10 h-6 rounded-full transition ${ad.active ? 'bg-[#1cdb5e]' : 'bg-gray-300 dark:bg-zinc-700'}`}></div>
                      <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform ${ad.active ? 'translate-x-4' : ''}`}></div>
                    </div>
                    <span className="ml-2 font-bold text-xs text-zinc-500">Active</span>
                  </label>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <label className="text-xs font-bold text-zinc-500">Close Button Timer (s):</label>
                    <input type="number" min="0" value={ad.timerDuration} onChange={(e) => updateVideoAd(adIndex, 'timerDuration', parseInt(e.target.value) || 0)} className="w-20 bg-white dark:bg-zinc-900 p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none" />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-zinc-500">Show Close After (Videos):</label>
                    <input type="number" min="1" max={ad.videos.length} value={ad.showCloseAfterVideos} onChange={(e) => updateVideoAd(adIndex, 'showCloseAfterVideos', parseInt(e.target.value) || 1)} className="w-20 bg-white dark:bg-zinc-900 p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none" />
                  </div>
               </div>

               <div className="space-y-3">
                 <div className="flex justify-between items-center">
                   <h4 className="text-sm font-bold text-zinc-600 dark:text-zinc-400 flex items-center gap-2"><Film className="w-4 h-4" /> Videos Sequence</h4>
                   <button onClick={() => addMediaToVideoAd(adIndex)} className="text-xs font-bold text-[#1cdb5e] hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Add Video</button>
                 </div>
                 
                 {ad.videos.map((media, mediaIndex) => (
                   <div key={mediaIndex} className="flex gap-2 items-center bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700">
                     <span className="text-xs font-bold text-zinc-400 w-6">{mediaIndex + 1}.</span>
                     <input 
                       type="text" 
                       value={media.url} 
                       onChange={(e) => updateVideoMedia(adIndex, mediaIndex, 'url', e.target.value)} 
                       className="flex-1 bg-transparent text-sm outline-none" 
                       placeholder="Video URL (e.g., mp4 link)" 
                     />
                     <select 
                       value={media.ratio} 
                       onChange={(e) => updateVideoMedia(adIndex, mediaIndex, 'ratio', e.target.value)}
                       className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded-lg text-xs font-bold outline-none border-none"
                     >
                       {RATIO_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                     </select>
                     {ad.videos.length > 1 && (
                       <button onClick={() => removeVideoMedia(adIndex, mediaIndex)} className="text-red-500 hover:text-red-700 p-1"><Trash2 className="w-4 h-4" /></button>
                     )}
                   </div>
                 ))}
               </div>
            </div>
          ))}
          {videoAds.length === 0 && (
            <div className="text-center py-8 text-zinc-500 text-sm">
               No video ads configured. Click "Add Video Ad" to create one.
            </div>
          )}
        </div>
      </div>

      {/* Photo Ads Section */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800">
        <div className="flex justify-between items-center mb-6">
           <h3 className="text-xl font-bold">Photo Ads (Images / Sliders)</h3>
           <button onClick={addPhotoAd} className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-zinc-200">
             <Plus className="w-4 h-4" /> Add Photo Ad
           </button>
        </div>

        <div className="space-y-6">
          {photoAds.map((ad, adIndex) => (
            <div key={ad.id} className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl relative bg-zinc-50 dark:bg-zinc-800/50">
               <button onClick={() => removePhotoAd(adIndex)} className="absolute top-4 right-4 text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition">
                 <Trash2 className="w-4 h-4" />
               </button>
               
               <div className="flex items-center gap-4 mb-4">
                 <label className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input type="checkbox" className="sr-only" checked={ad.active} onChange={(e) => updatePhotoAd(adIndex, "active", e.target.checked)} />
                      <div className={`block w-10 h-6 rounded-full transition ${ad.active ? 'bg-[#1cdb5e]' : 'bg-gray-300 dark:bg-zinc-700'}`}></div>
                      <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform ${ad.active ? 'translate-x-4' : ''}`}></div>
                    </div>
                    <span className="ml-2 font-bold text-xs text-zinc-500">Active</span>
                  </label>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 
                 <div className="md:col-span-2 space-y-3">
                   <div className="flex justify-between items-center">
                     <h4 className="text-sm font-bold text-zinc-600 dark:text-zinc-400 flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Images Sequence</h4>
                     <button onClick={() => addMediaToPhotoAd(adIndex)} className="text-xs font-bold text-[#1cdb5e] hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Add Image</button>
                   </div>
                   {ad.images.map((media, mediaIndex) => (
                     <div key={mediaIndex} className="flex gap-2 items-center bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700">
                       <span className="text-xs font-bold text-zinc-400 w-6">{mediaIndex + 1}.</span>
                       <input 
                         type="text" 
                         value={media.url} 
                         onChange={(e) => updatePhotoMedia(adIndex, mediaIndex, 'url', e.target.value)} 
                         className="flex-1 bg-transparent text-sm outline-none" 
                         placeholder="Image URL" 
                       />
                       <label className="bg-zinc-100 dark:bg-zinc-800 px-3 py-2 rounded-lg cursor-pointer flex-shrink-0 text-xs font-bold flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 transition">
                         Upload
                         <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && updatePhotoMedia(adIndex, mediaIndex, 'url', '', e.target.files[0])} />
                       </label>
                       <select 
                         value={media.ratio} 
                         onChange={(e) => updatePhotoMedia(adIndex, mediaIndex, 'ratio', e.target.value)}
                         className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded-lg text-xs font-bold outline-none border-none"
                       >
                         {RATIO_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                       </select>
                       {ad.images.length > 1 && (
                         <button onClick={() => removePhotoMedia(adIndex, mediaIndex)} className="text-red-500 hover:text-red-700 p-1"><Trash2 className="w-4 h-4" /></button>
                       )}
                     </div>
                   ))}
                 </div>
                 
                 <div>
                    <label className="block text-xs font-bold mb-1 text-zinc-500">Title (HTML allowed)</label>
                    <input 
                      type="text" 
                      value={ad.title} 
                      onChange={(e) => updatePhotoAd(adIndex, "title", e.target.value)} 
                      className="w-full bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none" 
                      placeholder="e.g. Special Offer!" 
                    />
                 </div>
                 
                 <div className="md:col-span-2">
                    <label className="block text-xs font-bold mb-1 text-zinc-500">Body Text (HTML allowed for links)</label>
                    <textarea 
                      value={ad.text} 
                      onChange={(e) => updatePhotoAd(adIndex, "text", e.target.value)} 
                      className="w-full bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none h-20" 
                      placeholder="e.g. Use code <a href='/'>XYZ</a> to get 10% off!" 
                    />
                 </div>

                 <div>
                    <label className="block text-xs font-bold mb-1 text-zinc-500">Button Text</label>
                    <input 
                      type="text" 
                      value={ad.buttonText} 
                      onChange={(e) => updatePhotoAd(adIndex, "buttonText", e.target.value)} 
                      className="w-full bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none" 
                      placeholder="e.g. Shop Now" 
                    />
                 </div>

                 <div>
                    <label className="block text-xs font-bold mb-1 text-zinc-500">Button Link</label>
                    <input 
                      type="text" 
                      value={ad.buttonLink} 
                      onChange={(e) => updatePhotoAd(adIndex, "buttonLink", e.target.value)} 
                      className="w-full bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none" 
                      placeholder="e.g. /all-products or https://..." 
                    />
                 </div>

               </div>
            </div>
          ))}
          {photoAds.length === 0 && (
            <div className="text-center py-8 text-zinc-500 text-sm">
               No photo ads configured. Click "Add Photo Ad" to create one.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageAds;

