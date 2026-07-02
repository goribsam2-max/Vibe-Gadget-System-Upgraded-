import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { X, Play, Pause, Volume2, VolumeX, RotateCcw, RotateCw } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';

export const AdManager: React.FC = () => {
  const [videoAds, setVideoAds] = useState<any[]>([]);
  const [photoAds, setPhotoAds] = useState<any[]>([]);
  
  const [activeVideoAd, setActiveVideoAd] = useState<any>(null);
  const [activePhotoAd, setActivePhotoAd] = useState<any>(null);
  
  const [showVideo, setShowVideo] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);

  // Video Ad States
  const [currentVideoMediaIndex, setCurrentVideoMediaIndex] = useState(0);
  const [videoCountdown, setVideoCountdown] = useState(5);
  const [showCloseButton, setShowCloseButton] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const pageViews = useRef(0);

  // Photo Ad Carousel
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (emblaApi) {
      emblaApi.on('select', () => {
        setCurrentSlide(emblaApi.selectedScrollSnap());
      });
    }
  }, [emblaApi]);

  useEffect(() => {
    const fetchAds = async () => {
      const snap = await getDoc(doc(db, 'settings', 'ads'));
      if (snap.exists()) {
        const data = snap.data();
        let activeVideoAds = [];
        if (data.videoAds && data.videoAds.length > 0) {
          activeVideoAds = data.videoAds.filter((a: any) => a.active && a.videos?.length > 0).map((a: any, i: number) => ({...a, id: a.id || `video-${i}`}));
        } else if (data.videoAd && data.videoAd.active) {
          activeVideoAds = [{
            id: 'legacy-video',
            active: data.videoAd.active,
            videos: [{ url: data.videoAd.url, ratio: '16/9' }],
            timerDuration: 5,
            showCloseAfterVideos: 1
          }];
        }
        setVideoAds(activeVideoAds);
        
        if (data.photoAds && data.photoAds.length > 0) {
          setPhotoAds(data.photoAds.filter((a: any) => a.active).map((a: any, i: number) => ({...a, id: a.id || `photo-${i}`})));
        }
      }
    };
    fetchAds();
  }, []);

  useEffect(() => {
    // Determine what to show on first load
    if (videoAds.length > 0 || photoAds.length > 0) {
      const sessionShown = sessionStorage.getItem('vibe_ad_session');
      
      if (!sessionShown) {
        setTimeout(() => {
          triggerRandomAd();
          sessionStorage.setItem('vibe_ad_session', 'true');
        }, 1500);
      }
    }
  }, [videoAds, photoAds]);

  useEffect(() => {
    // Page views tracker for triggering ads while surfing
    if (photoAds.length > 0 || videoAds.length > 0) {
      pageViews.current += 1;
      // Show ad after 4 pages
      if (pageViews.current >= 4) {
        if (!showVideo && !showPhoto) {
          triggerRandomAd();
          pageViews.current = 0; // Reset
        }
      }
    }
  }, [location.pathname]);

  useEffect(() => {
    // Show ad after 1 minute on the website
    const timer = setTimeout(() => {
       if (!showVideo && !showPhoto && !sessionStorage.getItem('vibe_1min_ad_shown')) {
         triggerRandomAd();
         sessionStorage.setItem('vibe_1min_ad_shown', 'true');
       }
    }, 60000); // 1 minute
    return () => clearTimeout(timer);
  }, [showVideo, showPhoto]);

  const triggerRandomAd = () => {
    const now = Date.now();
    const shownAdsStr = localStorage.getItem('vibe_shown_ads_24h');
    let shownAds: Record<string, number> = {};
    if (shownAdsStr) {
      try {
        shownAds = JSON.parse(shownAdsStr);
      } catch (e) {}
    }

    // Filter out ads shown in the last 24 hours
    const availableVideoAds = videoAds.filter(ad => !shownAds[ad.id] || now - shownAds[ad.id] > 24 * 60 * 60 * 1000);
    const availablePhotoAds = photoAds.filter(ad => !shownAds[ad.id] || now - shownAds[ad.id] > 24 * 60 * 60 * 1000);

    const types = [];
    if (availableVideoAds.length > 0) types.push('video');
    if (availablePhotoAds.length > 0) types.push('photo');
    
    if (types.length === 0) return; // All ads are on cooldown
    
    const selectedType = types[Math.floor(Math.random() * types.length)];
    
    if (selectedType === 'video') {
      const ad = availableVideoAds[Math.floor(Math.random() * availableVideoAds.length)];
      setActiveVideoAd(ad);
      setCurrentVideoMediaIndex(0);
      setVideoCountdown(ad.timerDuration !== undefined ? ad.timerDuration : 5);
      setShowCloseButton(ad.showCloseAfterVideos <= 1 && (ad.timerDuration === 0 || !ad.timerDuration));
      setShowVideo(true);
      
      // Mark as shown
      shownAds[ad.id] = now;
      localStorage.setItem('vibe_shown_ads_24h', JSON.stringify(shownAds));
    } else {
      const ad = availablePhotoAds[Math.floor(Math.random() * availablePhotoAds.length)];
      const migratedAd = {
        ...ad,
        images: ad.images || (ad.image ? [{ url: ad.image, ratio: '4/3' }] : [])
      };
      setActivePhotoAd(migratedAd);
      setCurrentSlide(0);
      setShowPhoto(true);
      if (emblaApi) emblaApi.scrollTo(0);
      
      // Mark as shown
      shownAds[ad.id] = now;
      localStorage.setItem('vibe_shown_ads_24h', JSON.stringify(shownAds));
    }
  };

  // Video Timer logic
  useEffect(() => {
    let timer: any;
    if (showVideo && activeVideoAd) {
      if (!showCloseButton) {
        const threshold = activeVideoAd.showCloseAfterVideos || 1;
        if (currentVideoMediaIndex + 1 >= threshold) {
          if (videoCountdown > 0) {
            timer = setInterval(() => {
              setVideoCountdown(prev => {
                if (prev <= 1) {
                  setShowCloseButton(true);
                  return 0;
                }
                return prev - 1;
              });
            }, 1000);
          } else {
             setShowCloseButton(true);
          }
        }
      }
    }
    return () => clearInterval(timer);
  }, [showVideo, activeVideoAd, videoCountdown, currentVideoMediaIndex, showCloseButton]);

  const handleVideoEnded = () => {
    if (activeVideoAd && currentVideoMediaIndex < activeVideoAd.videos.length - 1) {
      setCurrentVideoMediaIndex(prev => prev + 1);
    } else {
       // All videos ended
       setShowCloseButton(true);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const skip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds;
    }
  };

  const closeVideo = () => {
    if (!showCloseButton) return;
    if (videoRef.current) videoRef.current.pause();
    setShowVideo(false);
  };

  const closePhoto = () => {
    setShowPhoto(false);
  };

  const getRatioStyle = (ratio: string) => {
    if (!ratio || ratio === 'auto') return undefined;
    // ratio is '1/1', '4/3', '16/9', etc.
    return { aspectRatio: ratio };
  };

  return (
    <>
      {/* Video Ad Popup */}
      <AnimatePresence>
        {showVideo && activeVideoAd && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-black rounded-3xl overflow-hidden shadow-2xl border border-zinc-800 relative max-w-3xl w-full"
            >
              <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
                {!showCloseButton ? (
                   <div className="bg-black/50 backdrop-blur-md text-white text-xs font-bold px-4 py-2 rounded-full">
                     {(activeVideoAd.showCloseAfterVideos > currentVideoMediaIndex + 1) ? 
                        `Video ${currentVideoMediaIndex + 1}/${activeVideoAd.videos.length}` 
                        : `Skip in ${videoCountdown}s`
                     }
                   </div>
                ) : (
                  <button 
                    onClick={closeVideo}
                    className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white p-2 rounded-full transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div 
                className="relative w-full bg-black flex items-center justify-center min-h-[200px]"
                style={getRatioStyle(activeVideoAd.videos[currentVideoMediaIndex]?.ratio)}
              >
                <video 
                  key={currentVideoMediaIndex} // Force remount on source change
                  ref={videoRef}
                  src={activeVideoAd.videos[currentVideoMediaIndex]?.url}
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                  onEnded={handleVideoEnded}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
                
                {/* Custom Player Controls overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity flex flex-col justify-end p-6">
                  <div className="flex items-center justify-center gap-6 mb-4">
                    <button onClick={() => skip(-5)} className="text-white hover:text-[#1cdb5e] transition"><RotateCcw className="w-8 h-8" /></button>
                    <button onClick={togglePlay} className="text-white bg-white/20 p-4 rounded-full hover:bg-white/30 transition">
                      {isPlaying ? <Pause className="w-8 h-8" fill="currentColor" /> : <Play className="w-8 h-8" fill="currentColor" />}
                    </button>
                    <button onClick={() => skip(5)} className="text-white hover:text-[#1cdb5e] transition"><RotateCw className="w-8 h-8" /></button>
                  </div>
                  <div className="flex justify-between items-center">
                     <button onClick={toggleMute} className="text-white hover:text-[#1cdb5e] transition">
                       {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                     </button>
                     <div className="text-white text-xs font-bold bg-black/40 px-3 py-1 rounded-full">
                       {currentVideoMediaIndex + 1} / {activeVideoAd.videos.length}
                     </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Photo Ad Popup (New Design) */}
      <AnimatePresence>
        {showPhoto && activePhotoAd && (
          <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-[320px] overflow-hidden shadow-2xl flex flex-col items-center border border-transparent dark:border-zinc-800"
            >
              {activePhotoAd.images && activePhotoAd.images.length > 0 && (
                <div className="w-full relative overflow-hidden" ref={emblaRef}>
                  <div className="flex">
                    {activePhotoAd.images.map((img: any, idx: number) => (
                      <div 
                        key={idx} 
                        className="flex-[0_0_100%] min-w-0 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center min-h-[200px]"
                        style={getRatioStyle(img.ratio)}
                      >
                        <img src={img.url} alt={`Promo ${idx}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="px-6 pt-6 pb-4 text-center w-full">
                {activePhotoAd.title && (
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2 tracking-tight" dangerouslySetInnerHTML={{__html: activePhotoAd.title}} />
                )}
                {activePhotoAd.text && (
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-4 leading-relaxed" dangerouslySetInnerHTML={{__html: activePhotoAd.text}} />
                )}

                {/* Pagination Dots */}
                {activePhotoAd.images && activePhotoAd.images.length > 1 && (
                  <div className="flex justify-center gap-1.5 mb-6">
                    {activePhotoAd.images.map((_: any, index: number) => (
                      <div 
                        key={index} 
                        className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${index === currentSlide ? 'bg-zinc-800 dark:bg-zinc-200 scale-125' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                      />
                    ))}
                  </div>
                )}
                
                <div className="flex w-full border-t border-zinc-100 dark:border-zinc-800 pt-1 mt-2">
                    <button 
                        onClick={closePhoto} 
                        className="flex-1 py-3 text-zinc-500 dark:text-zinc-400 font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition"
                    >
                        Cancel
                    </button>
                    {activePhotoAd.buttonText && (
                      <>
                        <div className="w-[1px] bg-zinc-100 dark:bg-zinc-800"></div>
                        <button 
                            onClick={() => {
                                closePhoto();
                                if (activePhotoAd.buttonLink) {
                                  if (activePhotoAd.buttonLink.startsWith('http')) {
                                    window.open(activePhotoAd.buttonLink, '_blank');
                                  } else {
                                    navigate(activePhotoAd.buttonLink);
                                  }
                                }
                            }}
                            className="flex-1 py-3 text-[#1cdb5e] font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition"
                        >
                            {activePhotoAd.buttonText}
                        </button>
                      </>
                    )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

