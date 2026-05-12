import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Users, ShoppingBag, Truck, CreditCard, 
  Settings, BarChart3, ShieldCheck, Search,
  CheckCircle, XCircle, Plus, Trash2, Layout,
  Layers, Camera, ChevronRight, Store, X, Clock, Bell,
  ArrowLeft, User, Box, Gift, Image as ImageIcon, FileText,
  MessageSquare, Package, Eye, EyeOff, MapPin, Phone, Globe,
  TrendingUp, ArrowUpRight, Zap, Percent, ReceiptText, Sparkles, Monitor, Smartphone, Tablet
} from 'lucide-react';
import { adminService } from '../services/adminService';
import { formatCurrency } from '../lib/utils';
import { collection, onSnapshot, query, orderBy, where, doc, getDocs, Timestamp, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { AuthContext } from '../App';
import Invoice from '../components/Invoice';
import ImageUpload from '../components/ImageUpload';
import { format, addHours } from 'date-fns';

import { calculateDistance, formatDistance } from '../lib/geoUtils';

type AdminTab = 'dashboard' | 'products' | 'approvals' | 'banners' | 'stories' | 'categories' | 'users' | 'riders' | 'financials' | 'promotions' | 'pages' | 'coupons' | 'abandonment' | 'deals' | 'neural_push' | 'email_marketing' | 'settings' | 'orders' | 'bundles';

export default function AdminPanel() {
  const { user, role, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [deliveryAreas, setDeliveryAreas] = useState<any[]>([]);
  const [newArea, setNewArea] = useState({ name: '', fee: 50 });
  const [riderLocations, setRiderLocations] = useState<Record<string, any>>({});
  const [sellers, setSellers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [userFilter, setUserFilter] = useState<'all' | 'push_enabled' | 'push_disabled' | 'pending'>('all');

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [activeStatusModal, setActiveStatusModal] = useState<string | null>(null);
  
  const [offers, setOffers] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [newOffer, setNewOffer] = useState({
    title: '',
    description: '',
    type: 'flash',
    bannerImage: '',
    discountType: 'percentage',
    discountAmount: 0,
    targetType: 'all',
    productIds: [] as string[],
    categoryId: '',
    subCategoryId: '',
    startTime: '',
    endTime: '',
    timerEnabled: true,
    sendPush: true,
    pushTitle: '',
    pushBody: '',
    redirectType: 'deal',
    redirectId: '',
    hasDetailsPage: false,
    detailsTitle: '',
    detailsDescription: '',
    detailsBanner: '',
    detailsCTA: 'Shop Now',
    isActive: true
  });
  const [abandonedCarts, setAbandonedCarts] = useState<any[]>([]);
  const [newCoupon, setNewCoupon] = useState({ 
    code: '', 
    type: 'percentage', 
    value: 0, 
    minOrder: 0, 
    maxDiscount: 500, 
    usageLimit: 100, 
    expiryDate: '',
    isActive: true
  });

  // Helper for notifications
  const sendNotification = async (userId: string, title: string, message: string, type: string = 'info') => {
    try {
      await addDoc(collection(db, 'notifications'), {
        userId,
        title,
        message,
        type,
        isRead: false,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.error("Error sending notification:", e);
    }
  };

  const handleBroadcastOffer = async (offer: any) => {
    try {
      const response = await fetch('/api/broadcast-fcm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification: {
            title: offer.pushTitle || `🔥 ${offer.title} Deal is LIVE!`,
            body: offer.pushBody || `Limited time ${offer.type} offer started. Don't miss out! ⏰`
          },
          data: { 
            url: offer.hasDetailsPage ? `/deal/${offer.id}` : 
                 offer.redirectType === 'deal' ? `/products?offer=${offer.id}` : 
                 offer.redirectType === 'category' ? `/products?category=${offer.categoryId}` :
                 offer.redirectType === 'product' ? `/product/${offer.redirectId}` :
                 offer.redirectId || `/deal/${offer.id}`,
            offerId: offer.id
          }
        })
      });
      
      const result = await response.json();
      if (response.ok) {
        alert(`Broadcast successful! Signals sent to ${result.successCount || 0} nodes.`);
        console.log("Push Result:", result);
      } else {
        throw new Error(result.details || result.error || 'Unknown server error');
      }
    } catch (e: any) {
      console.error(e);
      alert(`Push Transmission Failed: ${e.message}`);
    }
  };

  const handleUpdateOrderStatus = async (order: any, status: string, paymentStatus?: string) => {
    await adminService.updateOrderStatus(order.id, status, paymentStatus);
    
    // Notification logic
    let title = "Order Update";
    let message = "";

    if (status === 'confirmed') {
      message = `আপনার অর্ডার (${order.id.slice(-6)}) কনফার্ম করা হয়েছে। আমরা শীঘ্রই ডেলিভারি প্রক্রিয়া শুরু করবো।`;
    } else if (status === 'verified' || paymentStatus === 'verified') {
      title = "Payment Verified";
      message = `আপনার পেমেন্ট সফলভাবে যাচাই করা হয়েছে। ধন্যবাদ!`;
    } else if (status === 'cancelled') {
        title = "Order Cancelled";
        message = `দুঃখিত, আপনার অর্ডারটি বাতিল করা হয়েছে। বিস্তারিত জানতে যোগাযোগ করুন।`;
    } else if (status === 'shipped') {
        title = "Order Shipped";
        message = `আপনার অর্ডারটি ডেলিভারির জন্য পাঠানো হয়েছে।`;
    }

    if (message && order.userId) {
      await sendNotification(order.userId, title, message, status === 'cancelled' ? 'alert' : 'success');
    }
    
    setActiveStatusModal(null);
  };
  
  // Update rider locations
  useEffect(() => {
    if (activeTab === 'riders' || activeTab === 'orders') {
        const riders = sellers.filter(s => s.role === 'rider');
        const locs: Record<string, any> = {};
        riders.forEach(r => {
            if (r.location) locs[r.id] = r.location;
        });
        setRiderLocations(locs);
    }
  }, [activeTab, sellers]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [newSubCategory, setNewSubCategory] = useState('');
  
  // Data States
  const [banners, setBanners] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [bundles, setBundles] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [appSettings, setAppSettings] = useState<any>({ logo: '' });
  const [fcmStatus, setFcmStatus] = useState<any>(null);

  useEffect(() => {
    const fetchFcmStatus = async () => {
      try {
        const res = await fetch('/api/fcm-status');
        const data = await res.json();
        setFcmStatus(data);
      } catch (e) {
        console.error("Failed to fetch FCM status:", e);
      }
    };
    fetchFcmStatus();
  }, []);

  // Filters & Bulk Actions
  const [productFilter, setProductFilter] = useState({ category: '', status: '', seller: '', search: '' });
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  
  const filteredProducts = products.filter(p => {
    const matchesCat = !productFilter.category || p.category === productFilter.category;
    const matchesStatus = !productFilter.status || p.status === productFilter.status;
    const matchesSeller = !productFilter.seller || p.farmer === productFilter.seller || p.farmerName === productFilter.seller;
    const searchLow = productFilter.search.toLowerCase();
    const matchesSearch = !productFilter.search || 
      p.name?.toLowerCase().includes(searchLow) || 
      p.nameEn?.toLowerCase().includes(searchLow) ||
      p.category?.toLowerCase().includes(searchLow) ||
      p.farmer?.toLowerCase().includes(searchLow);
    return matchesCat && matchesStatus && matchesSeller && matchesSearch;
  });

  const handleBulkAction = async (action: 'approve' | 'reject' | 'delete') => {
    if (selectedProducts.length === 0) return;
    if (!confirm(`Are you sure you want to ${action} ${selectedProducts.length} products?`)) return;
    
    for (const id of selectedProducts) {
      if (action === 'approve') await adminService.approveProduct(id);
      if (action === 'reject') await adminService.rejectProduct(id);
      if (action === 'delete') await adminService.deleteProduct(id);
    }
    setSelectedProducts([]);
  };

  const pendingProducts = products.filter(p => p.status === 'pending');
  const approvedProducts = products.filter(p => p.status === 'approved');
  const pendingSellers = sellers.filter(s => s.roleRequest === 'seller' || (s.role === 'customer' && s.shopName && !s.isVerified));

  // Form States
  const [newBanner, setNewBanner] = useState({ title: '', subtitle: '', image: '' });
  const [newStory, setNewStory] = useState({ name: '', role: '', quote: '', image: '', type: 'Member' });
  const [newCategory, setNewCategory] = useState({ title: '', titleEn: '', image: '', subCategories: '', subCategoriesEn: '', salesCount: '0' });
  const [newProduct, setNewProduct] = useState({ 
    name: '', 
    nameEn: '', 
    price: '', 
    discountPrice: '',
    category: '', 
    subCategory: '', 
    image: '', 
    unit: 'kg', 
    minWeight: '0.1',
    weightIncrements: '0.1',
    farmer: '', 
    location: '', 
    description: '', 
    descriptionEn: '', 
    whatsappNumber: '',
    searchKeywords: '',
    pricingType: 'piece',
    allowedWeights: '100g, 250g, 500g, 1kg',
    defaultWeight: '250',
    stockQuantity: '100',
    lowStockAlert: '10',
    salesCount: '0',
    isOutOfStock: false,
    seoDescription: '',
    seoKeywords: '',
    tags: ''
  });
  const [newBundle, setNewBundle] = useState({ name: '', nameEn: '', price: '', image: '', description: '', descriptionEn: '' });
  const [newPromotion, setNewPromotion] = useState({ 
    title: '', 
    percentage: 5, 
    duration: 1, 
    targetType: 'category', 
    targetId: '' 
  });
  const [newPage, setNewPage] = useState({
      title: '',
      slug: '',
      content: '',
      isVisible: true,
      seoTitle: '',
      seoDescription: '',
      seoKeywords: ''
  });
  const [editingPageId, setEditingPageId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && role !== 'admin') {
        navigate('/');
        return;
    }

    if (role !== 'admin') return;

    const unsubBanners = onSnapshot(query(collection(db, 'banners'), orderBy('createdAt', 'desc')), (snap) => {
      setBanners(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Admin Banners:", error));

    const unsubStories = onSnapshot(query(collection(db, 'stories'), orderBy('createdAt', 'desc')), (snap) => {
      setStories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Admin Stories:", error));

    const unsubCategories = onSnapshot(collection(db, 'categories'), (snap) => {
      setCategories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Admin Categories:", error));

    const unsubProducts = onSnapshot(collection(db, 'products'), (snap) => {
      setProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Admin Products:", error));

    const unsubBundles = onSnapshot(query(collection(db, 'products'), where('isBundle', '==', true)), (snap) => {
      setBundles(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Admin Bundles:", error));

    const unsubSettings = onSnapshot(doc(db, 'settings', 'app'), (snap) => {
      if (snap.exists()) setAppSettings(snap.data());
    }, (error) => console.error("Admin Settings:", error));

    const unsubSellers = onSnapshot(collection(db, 'users'), (snap) => {
      const users = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSellers(users);
    }, (error) => console.error("Admin Users:", error));

    const unsubOrders = onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc')), (snap) => {
      setOrders(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Admin Orders:", error));

    const unsubAreas = onSnapshot(collection(db, 'delivery_areas'), (snap) => {
      setDeliveryAreas(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Admin Areas:", error));

    const unsubNotifs = onSnapshot(query(collection(db, 'notifications'), orderBy('createdAt', 'desc')), (snap) => {
      setNotifications(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Admin Notifs:", error));

    const unsubPayouts = onSnapshot(query(collection(db, 'payouts'), orderBy('createdAt', 'desc')), (snap) => {
      setPayouts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Admin Payouts:", error));

    const unsubPromotions = onSnapshot(collection(db, 'promotions'), (snap) => {
      setPromotions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Admin Promotions:", error));

    const unsubPages = onSnapshot(query(collection(db, 'pages'), orderBy('createdAt', 'desc')), (snap) => {
      setPages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Admin Pages:", error));

    const unsubCoupons = onSnapshot(collection(db, 'coupons'), (snap) => {
      setCoupons(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Admin Coupons:", error));

    const unsubAbandoned = onSnapshot(query(collection(db, 'abandoned_carts'), orderBy('createdAt', 'desc')), (snap) => {
      setAbandonedCarts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Admin Abandoned Carts:", error));

    const unsubOffers = onSnapshot(collection(db, 'offers'), (snap) => {
      setOffers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Admin Offers:", error));

    return () => {
      unsubBanners();
      unsubStories();
      unsubCategories();
      unsubProducts();
      unsubBundles();
      unsubSettings();
      unsubSellers();
      unsubOrders();
      unsubAreas();
      unsubNotifs();
      unsubPayouts();
      unsubPromotions();
      unsubPages();
      unsubCoupons();
      unsubAbandoned();
      unsubOffers();
    };
  }, [role, authLoading, navigate]);

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.image) return;

    // Auto-generate SEO fields if empty
    const finalSeoDescription = newProduct.seoDescription || (newProduct.nameEn + ' - ' + newProduct.descriptionEn).slice(0, 160);
    const finalSeoKeywords = newProduct.seoKeywords || [newProduct.name, newProduct.nameEn, newProduct.category, 'fresh', 'shopping'].join(', ');

    const productData = {
      ...newProduct,
      salesCount: parseInt(newProduct.salesCount as any) || 0,
      price: parseFloat(newProduct.price) || 0,
      discountPrice: newProduct.discountPrice ? parseFloat(newProduct.discountPrice) : null,
      stockQuantity: parseInt(newProduct.stockQuantity) || 0,
      lowStockAlert: parseInt(newProduct.lowStockAlert as any) || 10,
      isOutOfStock: newProduct.isOutOfStock,
      minWeight: parseFloat(newProduct.minWeight) || 0.1,
      weightIncrements: parseFloat(newProduct.weightIncrements) || 0.1,
      allowedWeights: newProduct.allowedWeights ? newProduct.allowedWeights.split(',').map((w: string) => w.trim()) : [],
      defaultWeight: parseFloat(newProduct.defaultWeight) || 250,
      tags: newProduct.tags ? newProduct.tags.split(',').map((t: string) => t.trim()) : [],
      searchKeywords: newProduct.searchKeywords ? newProduct.searchKeywords.split(',').map((k: string) => k.trim().toLowerCase()) : [],
      seoDescription: finalSeoDescription,
      seoKeywords: finalSeoKeywords
    };

    if (editingProductId) {
      await adminService.updateProduct(editingProductId, productData);
    } else {
      await adminService.addProduct(productData);
    }

    setNewProduct({ 
      name: '', 
      nameEn: '', 
      price: '', 
      discountPrice: '',
      category: '', 
      subCategory: '', 
      image: '', 
      unit: 'kg', 
      minWeight: '0.1',
      weightIncrements: '0.1',
      farmer: '', 
      location: '', 
      description: '', 
      descriptionEn: '', 
      tags: '',
      searchKeywords: '',
      seoDescription: '',
      seoKeywords: '',
      whatsappNumber: '',
      pricingType: 'piece',
      allowedWeights: '100g, 250g, 500g, 1kg',
      defaultWeight: '250',
      stockQuantity: '100',
      lowStockAlert: '10',
      salesCount: '0',
      isOutOfStock: false
    });
    setIsAdding(false);
    setEditingProductId(null);
  };

  const startEditingProduct = (product: any) => {
    setEditingProductId(product.id);
    setNewProduct({
      name: product.name || '',
      nameEn: product.nameEn || '',
      price: product.price?.toString() || '',
      discountPrice: product.discountPrice?.toString() || '',
      category: product.category || '',
      subCategory: product.subCategory || '',
      image: product.image || '',
      unit: product.unit || 'kg',
      minWeight: product.minWeight?.toString() || '0.1',
      weightIncrements: product.weightIncrements?.toString() || '0.1',
      farmer: product.farmer || '',
      location: product.location || '',
      description: product.description || '',
      descriptionEn: product.descriptionEn || '',
      tags: product.tags?.join(', ') || '',
      searchKeywords: product.searchKeywords?.join(', ') || '',
      seoDescription: product.seoDescription || '',
      seoKeywords: product.seoKeywords || '',
      whatsappNumber: product.whatsappNumber || '',
      pricingType: product.pricingType || 'piece',
      allowedWeights: product.allowedWeights?.join(', ') || '100g, 250g, 500g, 1kg',
      defaultWeight: product.defaultWeight?.toString() || '250',
      stockQuantity: product.stockQuantity?.toString() || '100',
      lowStockAlert: product.lowStockAlert?.toString() || '10',
      salesCount: product.salesCount?.toString() || '0',
      isOutOfStock: product.isOutOfStock || false
    });
    setIsAdding(true);
  };

  const handleAddBanner = async () => {
    if (!newBanner.image) {
      alert('Please upload an image first');
      return;
    }
    await adminService.addBanner(newBanner);
    setNewBanner({ title: '', subtitle: '', image: '' });
    setIsAdding(false);
  };

  const handleAddStory = async () => {
    if (!newStory.name || !newStory.image) return;
    await adminService.addStory(newStory);
    setNewStory({ name: '', role: '', quote: '', image: '', type: 'Farmer' });
    setIsAdding(false);
  };

  const handleAddCategory = async () => {
    if (!newCategory.title || !newCategory.image) return;
    const subCats = newCategory.subCategories.split(',').map(s => s.trim()).filter(s => s !== '');
    const subCatsEn = newCategory.subCategoriesEn.split(',').map(s => s.trim()).filter(s => s !== '');
    await adminService.addCategory({ 
      title: newCategory.title, 
      titleEn: newCategory.titleEn,
      image: newCategory.image, 
      subCategories: subCats,
      subCategoriesEn: subCatsEn,
      salesCount: parseInt(newCategory.salesCount as any) || 0
    });
    setNewCategory({ title: '', titleEn: '', image: '', subCategories: '', subCategoriesEn: '', salesCount: '0' });
    setIsAdding(false);
  };

  const handleAddBundle = async () => {
    if (!newBundle.name || !newBundle.price || !newBundle.image) return;
    await adminService.addBundle(newBundle);
    setNewBundle({ name: '', nameEn: '', price: '', image: '', description: '', descriptionEn: '' });
    setIsAdding(false);
  };

  const handleCreateOffer = async () => {
    if (!newOffer.title || !newOffer.endTime) return alert('Protocol Incomplete: Mission Parameters Missing');
    try {
      const offerRef = await addDoc(collection(db, 'offers'), {
        ...newOffer,
        createdAt: serverTimestamp(),
      });
      
      // If push enabled, trigger notification via API
      if (newOffer.sendPush) {
        await fetch('/api/broadcast-fcm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notification: {
              title: newOffer.pushTitle || `🔥 ${newOffer.title} Deal is LIVE!`,
              body: newOffer.pushBody || `Limited time ${newOffer.type} offer started. Don't miss out! ⏰`
            },
            data: { 
              url: newOffer.hasDetailsPage ? `/deal/${offerRef.id}` : 
                   newOffer.redirectType === 'deal' ? `/products?offer=${offerRef.id}` : 
                   newOffer.redirectType === 'category' ? `/products?category=${newOffer.categoryId}` :
                   newOffer.redirectType === 'product' ? `/product/${newOffer.redirectId}` :
                   newOffer.redirectId || '/',
              offerId: offerRef.id
            }
          })
        });
      }

      setIsAdding(false);
      setNewOffer({ 
        title: '', 
        description: '', 
        type: 'flash', 
        bannerImage: '', 
        discountType: 'percentage',
        discountAmount: 0,
        targetType: 'all',
        productIds: [], 
        categoryId: '', 
        subCategoryId: '',
        startTime: '', 
        endTime: '', 
        timerEnabled: true, 
        sendPush: true, 
        pushTitle: '', 
        pushBody: '', 
        redirectType: 'deal',
        redirectId: '',
        hasDetailsPage: false,
        detailsTitle: '',
        detailsDescription: '',
        detailsBanner: '',
        detailsCTA: 'Shop Now',
        isActive: true 
      });
    } catch (e) {
      console.error(e);
      alert('System Registry Failed');
    }
  };

  const handleCreateCoupon = async () => {
    if (!newCoupon.code || newCoupon.value <= 0) return alert('Manifest incomplete');
    try {
      await addDoc(collection(db, 'coupons'), {
        ...newCoupon,
        createdAt: serverTimestamp(),
        usedCount: 0
      });
      setIsAdding(false);
      setNewCoupon({ code: '', type: 'percentage', value: 0, minOrder: 0, maxDiscount: 500, usageLimit: 100, expiryDate: '', isActive: true });
    } catch (e) {
      console.error(e);
      alert('Coupon Entry Failed');
    }
  };

  const handleAddPromotion = async () => {
    if (!newPromotion.title || !newPromotion.percentage || (newPromotion.targetType !== 'all' && !newPromotion.targetId)) {
        alert('Please fill all fields');
        return;
    }

    const durationMs = parseInt(newPromotion.duration as any) * 60 * 60 * 1000;
    const endTime = Timestamp.fromMillis(Date.now() + durationMs);

    await adminService.addPromotion({
        ...newPromotion,
        percentage: Number(newPromotion.percentage),
        duration: Number(newPromotion.duration),
        endTime: endTime
    });

    setNewPromotion({ title: '', percentage: 5, duration: 1, targetType: 'category', targetId: '' });
    setIsAdding(false);
  };

  const handleAddPage = async () => {
      if (!newPage.title || !newPage.slug || !newPage.content) return;
      
      if (editingPageId) {
          await adminService.updatePage(editingPageId, newPage);
      } else {
          await adminService.addPage(newPage);
      }
      
      setNewPage({
          title: '',
          slug: '',
          content: '',
          isVisible: true,
          seoTitle: '',
          seoDescription: '',
          seoKeywords: ''
      });
      setEditingPageId(null);
      setIsAdding(false);
  };

  const startEditingPage = (page: any) => {
      setEditingPageId(page.id);
      setNewPage({
          title: page.title || '',
          slug: page.slug || '',
          content: page.content || '',
          isVisible: page.isVisible ?? true,
          seoTitle: page.seoTitle || '',
          seoDescription: page.seoDescription || '',
          seoKeywords: page.seoKeywords || ''
      });
      setIsAdding(true);
  };

  const updateLogo = async (base64: string) => {
    await adminService.updateAppSetting('logo', base64);
  };

  const handleAddSubCategory = async (catId: string, currentSubs: string[]) => {
    if (!newSubCategory.trim()) return;
    const updatedSubs = [...(currentSubs || []), newSubCategory.trim()];
    await adminService.updateCategory(catId, { subCategories: updatedSubs });
    setNewSubCategory('');
  };

  const handleRemoveSubCategory = async (catId: string, currentSubs: string[], subToRemove: string) => {
    const updatedSubs = currentSubs.filter(s => s !== subToRemove);
    await adminService.updateCategory(catId, { subCategories: updatedSubs });
  };

  const tabs = [
    { id: 'dashboard', label: 'Overview', icon: BarChart3 },
    { id: 'approvals', label: 'Approvals', icon: Clock },
    { id: 'orders', label: 'Orders', icon: Truck },
    { id: 'riders', label: 'Riders', icon: Truck },
    { id: 'products', label: 'Products', icon: ShoppingBag },
    { id: 'bundles', label: 'Bundles', icon: Gift },
    { id: 'banners', label: 'Banners', icon: Layout },
    { id: 'stories', label: 'Stories', icon: Camera },
    { id: 'categories', label: 'Categories', icon: Layers },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'neural_push', label: 'App Notifications', icon: Bell },
    { id: 'email_marketing', label: 'Email Marketing', icon: MessageSquare },
    { id: 'settings', label: 'Brand & Site', icon: Settings },
    { id: 'promotions', label: 'Flash Deals', icon: Zap },
    { id: 'deals', label: 'Deals System', icon: Sparkles },
    { id: 'financials', label: 'Financials', icon: CreditCard },
    { id: 'coupons', label: 'Coupons', icon: Percent },
    { id: 'abandonment', label: 'Abandonment', icon: Trash2 },
    { id: 'pages', label: 'Pages', icon: Layout },
  ];

  if (authLoading) return (
    <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="w-12 h-12 border-4 border-[#E21E26] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (role !== 'admin') return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-white text-[#111111]"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 pb-12">
        <div className="flex items-center justify-between py-8 border-b border-[#ECECEC] mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white border border-[#ECECEC] text-[#E21E26] rounded-2xl flex items-center justify-center shadow-lg">
              <ShieldCheck size={32} />
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl mb-0.5 text-[#111111]">Admin Central</h1>
              <p className="text-[#6B7280] text-[10px] font-black uppercase tracking-[0.2em] leading-none">System Management</p>
            </div>
          </div>

          <Link 
            to="/" 
            className="flex items-center gap-2 px-6 py-3 bg-white border border-[#ECECEC] rounded-2xl text-[10px] font-black uppercase tracking-widest text-[#6B7280] hover:text-[#E21E26] transition-all shadow-sm"
          >
            <ArrowLeft size={16} />
            Back to Shop
          </Link>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Navigation */}
          <aside className="w-full md:w-64 flex-shrink-0">
            <div className="sticky top-24 space-y-2">
              <div className="hidden md:block mb-4">
                <p className="text-[10px] font-black text-[#6B7280]/40 uppercase tracking-[0.3em] ml-1">Management Console</p>
              </div>
              
              <div className="flex md:flex-col gap-2 overflow-x-auto pb-4 md:pb-0 scrollbar-hide">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-3 px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border min-w-max md:min-w-0 md:w-full ${
                      activeTab === tab.id 
                        ? 'bg-[#111111] text-[#111111] border-[#111111] shadow-lg shadow-black/10' 
                        : 'bg-white text-[#6B7280] border-[#ECECEC] hover:border-[#E21E26]/20 hover:text-[#E21E26]'
                    }`}
                  >
                    <tab.icon size={18} />
                    {tab.label}
                  </button>
                ))}
            </div>
            </div>
          </aside>

          {/* Main Workspace Area */}
          <main className="flex-1 min-w-0 space-y-8">
            <AnimatePresence mode="wait">
        {activeTab === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { 
                  label: 'Total Orders', 
                  value: orders.length.toLocaleString(), 
                  color: 'text-blue-400', 
                  bg: 'bg-[#ECECEC] border-[#ECECEC]',
                  icon: <Truck size={20} />
                },
                { 
                  label: 'Processing', 
                  value: orders.filter(o => ['pending', 'verified', 'confirmed'].includes(o.status)).length.toLocaleString(), 
                  color: 'text-[#E21E26]', 
                  bg: 'bg-white border-[#ECECEC]',
                  icon: <Package size={20} />
                },
                { 
                  label: 'Net Revenue', 
                  value: `৳${formatCurrency(orders.filter(o => o.status !== 'cancelled').reduce((acc, o) => acc + (Number(o.total || 0)), 0))}`, 
                  color: 'text-[#E21E26]', 
                  bg: 'bg-red-50 border-[#E21E26]/20',
                  icon: <ArrowUpRight size={20} />
                },
                { 
                  label: 'All Users', 
                  value: (sellers.length || 0).toLocaleString(), 
                  color: 'text-[#111111]', 
                  bg: 'bg-white border-[#ECECEC]',
                  icon: <Users size={20} />
                },
                { 
                  label: 'Total Sellers', 
                  value: (sellers.filter(s => s.role === 'seller').length || 0).toLocaleString(), 
                  color: 'text-blue-600', 
                  bg: 'bg-white border-[#ECECEC]',
                  icon: <ShoppingBag size={20} />
                },
                { 
                  label: 'Total Riders', 
                  value: (sellers.filter(s => s.role === 'rider').length || 0).toLocaleString(), 
                  color: 'text-[#E21E26]', 
                  bg: 'bg-white border-[#ECECEC]',
                  icon: <Truck size={20} />
                },
                { 
                  label: 'Total Products', 
                  value: (products.length || 0).toLocaleString(), 
                  color: 'text-pink-600', 
                  bg: 'bg-white border-[#ECECEC]',
                  icon: <Plus size={20} />
                },
                { 
                  label: 'Avg Order Val', 
                  value: `৳${formatCurrency(orders.length > 0 ? (orders.reduce((acc, o) => acc + (Number(o.total || 0)), 0) / orders.length) : 0)}`, 
                  color: 'text-[#111111]', 
                  bg: 'bg-white border-[#ECECEC]',
                  icon: <TrendingUp size={20} />
                },
                { 
                  label: 'System Status', 
                  value: fcmStatus ? (fcmStatus.adminInitialized ? 'ONLINE' : 'SYNC ERR') : 'LOADING...', 
                  color: fcmStatus?.adminInitialized ? 'text-green-600' : 'text-red-400', 
                  bg: fcmStatus?.adminInitialized ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200',
                  icon: <Zap size={20} />
                },
              ].map((stat) => (
                <div key={stat.label} className={`${stat.bg} p-6 rounded-[2rem] border shadow-sm flex flex-col justify-between group hover:border-[#E21E26]/40 transition-all duration-300`}>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-black text-[#6B7280] uppercase tracking-widest leading-none">{stat.label}</p>
                    <div className={`${stat.color} opacity-40 group-hover:opacity-100 transition-opacity`}>
                        {stat.icon}
                    </div>
                  </div>
                  <h4 className={`text-2xl font-display font-black leading-none ${stat.color}`}>{stat.value}</h4>
                </div>
              ))}
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-[#ECECEC] shadow-sm">
                <h3 className="font-display font-bold text-lg mb-8 text-[#111111]">Recent Order Activity</h3>
                <div className="space-y-6">
                    {orders.slice(0, 5).map(order => (
                        <div key={order.id} className="flex items-center justify-between py-4 border-b border-[#ECECEC] last:border-0">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gray-50 border border-[#ECECEC] rounded-2xl flex items-center justify-center text-[#6B7280]">
                                    <Truck size={24} />
                                </div>
                                <div>
                                    <h5 className="text-xs font-bold text-[#111111]">Order #{order.id.slice(-6).toUpperCase()}</h5>
                                    <p className="text-[10px] text-[#6B7280] font-bold uppercase tracking-widest mt-1">{order.customerName}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold text-[#E21E26]">৳{formatCurrency(order.total || 0)}</p>
                                <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full mt-1 inline-block ${
                                    order.status === 'delivered' ? 'bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/20' :
                                    order.status === 'cancelled' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                                    'bg-[#E21E26]/10 text-[#E21E26] border border-[#E21E26]/20'
                                }`}>
                                    {order.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'approvals' && (
          <motion.div key="approvals" className="space-y-8">
            <div className="space-y-4">
              <h3 className="font-display font-bold text-lg px-2 flex items-center gap-3 text-[#111111]">
                <Store size={24} className="text-[#E21E26]" />
                Seller Verification Queue ({pendingSellers.length})
              </h3>
              {pendingSellers.map((seller) => (
                <div key={seller.id} className="bg-white p-6 rounded-3xl border border-[#ECECEC] shadow-sm">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-gray-50 border border-[#ECECEC] rounded-2xl flex items-center justify-center text-[#6B7280]">
                        <User size={28} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[#111111]">{seller.shopName || seller.displayName}</h4>
                        <p className="text-[10px] text-[#6B7280] font-bold uppercase tracking-widest mt-1">{seller.email}</p>
                        <p className="text-[10px] text-[#E21E26] font-black mt-2 tracking-widest uppercase">Requested Role: SELLER</p>
                      </div>
                    </div>
                    <div className="bg-[#E21E26]/10 text-[#E21E26] border border-[#E21E26]/20 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">Review Required</div>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => adminService.verifySeller(seller.id)}
                      className="flex-1 py-4 bg-[#F9FAFB] text-[#111111] rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-[#F9FAFB] transition-all"
                    >
                      Approve Seller
                    </button>
                  </div>
                </div>
              ))}
              {pendingSellers.length === 0 && (
                <div className="text-center py-16 text-[#6B7280]/40 text-xs bg-gray-50 rounded-[2.5rem] border border-dashed border-[#ECECEC]">
                  No sellers pending verification.
                </div>
              )}
            </div>

            <div className="space-y-6">
              <h3 className="font-display font-bold text-lg px-2 flex items-center gap-3 text-[#111111]">
                <Package size={24} className="text-[#E21E26]" />
                Product Approval Queue ({pendingProducts.length})
              </h3>
              {pendingProducts.map((prod) => (
              <div key={prod.id} className="bg-white p-6 rounded-3xl border border-[#ECECEC] shadow-sm transition-all hover:border-[#E21E26]/20">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-[#F9FAFB] border border-[#ECECEC] rounded-2xl flex items-center justify-center text-[#6B7280] overflow-hidden shadow-inner">
                      {prod.image ? <img src={prod.image} className="w-full h-full object-cover" alt="Product" /> : <ShoppingBag size={28} />}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#111111]">{prod.name}</h4>
                      <p className="text-[10px] text-[#6B7280] font-bold uppercase tracking-widest mt-1">{prod.farmerName || 'Unknown Seller'}</p>
                      <p className="text-xs font-bold text-[#E21E26] mt-2">৳{formatCurrency(prod.price)}</p>
                    </div>
                  </div>
                  <div className="bg-[#F9FAFB] text-[#6B7280] border border-[#ECECEC] px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">Pending</div>
                </div>
                
                <div className="bg-[#F9FAFB] p-4 rounded-2xl mb-6 text-[11px] text-[#4B5563] leading-relaxed italic border border-[#ECECEC]">
                  "{prod.description || 'No description provided'}"
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => adminService.rejectProduct(prod.id)}
                    className="flex-1 py-4 bg-white text-red-600 border border-[#ECECEC] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 transition-all"
                  >
                    Reject Item
                  </button>
                  <button 
                    onClick={() => adminService.approveProduct(prod.id)}
                    className="flex-1 py-4 bg-[#E21E26] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#E21E26]/20 hover:bg-[#B71C1C] transition-all"
                  >
                    Go Live
                  </button>
                </div>
              </div>
            ))}
            {pendingProducts.length === 0 && (
              <div className="text-center py-20 text-[#6B7280]/40 text-sm bg-[#F9FAFB] rounded-[2.5rem] border border-dashed border-[#ECECEC]">
                No products pending approval.
              </div>
            )}
          </div>
        </motion.div>
      )}

      {activeTab === 'orders' && (
          <motion.div key="orders" className="space-y-6">
            <h3 className="font-display font-bold text-lg px-2 text-[#111111]">Recent Tasks</h3>
            {orders.map((order) => (
              <div key={order.id} className="bg-white p-6 rounded-[2.5rem] border border-[#ECECEC] shadow-sm space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-xs text-[#111111]">#{order.id.slice(-8).toUpperCase()}</h4>
                    <p className="text-[10px] text-[#6B7280] font-bold uppercase tracking-widest mt-1">{order.customerName}</p>
                    <div className="flex flex-col gap-1 mt-3">
                      <p className="text-[10px] text-[#6B7280] flex items-center gap-2">
                        <Phone size={10} className="text-[#E21E26]" /> {order.phone}
                      </p>
                      <p className="text-[10px] text-[#6B7280] flex items-center gap-2">
                        <MapPin size={10} className="text-[#E21E26]" /> {typeof order.address === 'string' ? order.address : (order.address?.address || 'No Address')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-black text-lg text-[#E21E26] leading-none">৳{formatCurrency(order.total || 0)}</p>
                    <p className="text-[10px] text-[#6B7280] font-black uppercase tracking-widest mt-2">{order.paymentMethod}</p>
                    {(order.discount || 0) > 0 && <p className="text-[9px] text-[#E21E26] font-black tracking-widest mt-1">DISCOUNT: -৳{formatCurrency(order.discount)}</p>}
                    {order.location && (
                      <div className="flex flex-col items-end gap-2 mt-4">
                        <a 
                          href={`https://www.google.com/maps/dir/?api=1&destination=${order.location.lat},${order.location.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-blue-500/20 transition-all"
                        >
                          <Truck size={12} /> Navigate
                        </a>
                        {order.riderId && riderLocations[order.riderId] && (
                          <span className="text-[9px] font-black text-[#E21E26] bg-[#E21E26]/10 border border-[#E21E26]/20 px-3 py-1 rounded-lg uppercase tracking-widest">
                            Rider: {formatDistance(calculateDistance(riderLocations[order.riderId].lat, riderLocations[order.riderId].lng, order.location.lat, order.location.lng))} away
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-[#FFFFFF] rounded-2xl p-5 space-y-3 border border-[#ECECEC]">
                    <p className="text-[9px] font-black text-[#6B7280] uppercase tracking-[0.2em]">Itemized Receipt</p>
                    {order.items?.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-[11px] pb-2 border-b border-[#ECECEC] last:border-0 last:pb-0">
                            <div className="flex items-center gap-3">
                                <span className="font-black text-primary bg-primary/10 px-2 py-0.5 rounded text-[9px]">{item.quantity || 0}x</span>
                                <span className="text-[#6B7280] font-medium">{item.name}</span>
                            </div>
                            <span className="font-bold text-[#6B7280]">৳{formatCurrency((item.price || 0) * (item.quantity || 0))}</span>
                        </div>
                    ))}
                </div>

                {order.paymentMethod !== 'cod' && (
                  <div className="bg-[#ECECEC] p-4 rounded-2xl border border-[#ECECEC]">
                    <p className="text-[9px] font-black text-[#6B7280] uppercase tracking-widest mb-1">Transaction ID</p>
                    <p className="text-xs font-mono font-bold text-primary tracking-wider">{order.transactionId || 'NOT PROVIDED'}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  {order.status === 'pending' && (
                    <button 
                      onClick={() => setActiveStatusModal(order.id)}
                      className="flex-1 py-4 bg-primary text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={14} />
                      Confirm / যাচাই
                    </button>
                  )}
                  
                  {activeStatusModal === order.id && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute inset-0 z-10 bg-black/5 backdrop-blur-md rounded-[2.5rem] p-6 flex flex-col items-center justify-center gap-4 text-center"
                    >
                      <div className="mb-2">
                        <h5 className="font-display font-black text-xs uppercase tracking-widest text-primary mb-1">Confirm Order</h5>
                        <p className="text-[10px] text-[#6B7280] font-bold">অর্ডারের যাচাইকরণ সম্পন্ন করুন</p>
                      </div>
                      <div className="flex flex-col gap-3 w-full max-w-xs">
                        <button 
                          onClick={() => handleUpdateOrderStatus(order, 'confirmed', 'verified')}
                          className="w-full py-4 bg-primary text-black rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg"
                        >
                          <ShieldCheck size={14} /> Direct Verified & Confirm
                        </button>
                        <button 
                          onClick={() => handleUpdateOrderStatus(order, 'pending', 'verified')}
                          className="w-full py-4 bg-[#ECECEC] text-[#111111] border border-[#ECECEC] rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                          <CreditCard size={14} /> Payment Verified Only
                        </button>
                        <button 
                          onClick={() => handleUpdateOrderStatus(order, 'confirmed')}
                          className="w-full py-4 bg-[#ECECEC] text-[#6B7280] border border-[#ECECEC] rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                          <CheckCircle size={14} /> Direct Confirm (COD)
                        </button>
                        <button 
                          onClick={() => setActiveStatusModal(null)}
                          className="w-full py-3 text-[#6B7280] text-[9px] font-bold uppercase tracking-widest hover:text-[#111111]"
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  )}

                  <button 
                    onClick={() => handleUpdateOrderStatus(order, 'cancelled')}
                    className="px-6 py-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => setSelectedOrder(order)}
                    className="px-6 py-4 bg-[#ECECEC] border border-[#ECECEC] text-[#6B7280] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:text-[#111111] transition-all shadow-xl flex items-center gap-2"
                  >
                    <ReceiptText size={14} />
                    Invoice / মেমো
                  </button>
                </div>
              </div>
            ))}
            {orders.length === 0 && <p className="text-center py-24 text-[#6B7280] text-sm font-bold tracking-widest uppercase">No transactions found</p>}
          </motion.div>
        )}

        {activeTab === 'products' && (
          <motion.div key="products" className="space-y-8">
            <div className="flex gap-4">
                <button 
                  onClick={() => setIsAdding(true)}
                  className="flex-1 py-5 bg-primary text-black rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl hover:scale-[1.02] transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                  <Plus size={22} /> Add New Product
                </button>
                {selectedProducts.length > 0 && (
                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleBulkAction('approve')}
                      className="px-8 bg-green-500/10 text-green-400 border border-green-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-green-500/20 transition-all"
                    >
                      Approve ({selectedProducts.length})
                    </button>
                    <button 
                      onClick={() => handleBulkAction('delete')}
                      className="px-8 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all"
                    >
                      Delete
                    </button>
                  </div>
                )}
            </div>

            {/* Premium Filters */}
            <div className="bg-[#ECECEC] p-10 rounded-[3rem] border border-[#ECECEC] shadow-2xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                    <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.25em] block mb-3 ml-2">Search Catalog</label>
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7280] group-focus-within:text-primary transition-colors" size={18} />
                        <input 
                            placeholder="Find items..." 
                            className="w-full pl-12 pr-4 py-4 bg-[#FFFFFF] border border-[#ECECEC] rounded-2xl text-sm outline-none focus:border-primary/40 text-[#111111] transition-all shadow-inner"
                            value={productFilter.search}
                            onChange={e => setProductFilter({...productFilter, search: e.target.value})}
                        />
                    </div>
                </div>
                <div>
                    <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.25em] block mb-3 ml-2">Department</label>
                    <div className="relative">
                      <select 
                          className="w-full px-5 py-4 bg-[#FFFFFF] border border-[#ECECEC] rounded-2xl text-sm outline-none appearance-none text-[#111111] focus:border-primary/40 transition-all shadow-inner"
                          value={productFilter.category}
                          onChange={e => setProductFilter({...productFilter, category: e.target.value})}
                      >
                          <option value="" className="bg-[#F9FAFB]">All Collections</option>
                          {categories.map(c => <option key={c.id} value={c.title} className="bg-[#F9FAFB]">{c.title}</option>)}
                      </select>
                      <Layers className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B7280] pointer-events-none" size={16} />
                    </div>
                </div>
                <div>
                    <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.25em] block mb-3 ml-2">Status</label>
                    <div className="relative">
                      <select 
                          className="w-full px-5 py-4 bg-[#FFFFFF] border border-[#ECECEC] rounded-2xl text-sm outline-none appearance-none text-[#111111] focus:border-primary/40 transition-all shadow-inner"
                          value={productFilter.status}
                          onChange={e => setProductFilter({...productFilter, status: e.target.value})}
                      >
                          <option value="" className="bg-[#F9FAFB]">All Visibility</option>
                          <option value="approved" className="bg-[#F9FAFB]">Live (Approved)</option>
                          <option value="pending" className="bg-[#F9FAFB]">Pending Review</option>
                          <option value="rejected" className="bg-[#F9FAFB]">Rejected</option>
                      </select>
                      <Clock className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B7280] pointer-events-none" size={16} />
                    </div>
                </div>
                <div>
                    <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.25em] block mb-3 ml-2">Partner Store</label>
                    <div className="relative">
                      <select 
                          className="w-full px-5 py-4 bg-[#FFFFFF] border border-[#ECECEC] rounded-2xl text-sm outline-none appearance-none text-[#111111] focus:border-primary/40 transition-all shadow-inner"
                          value={productFilter.seller}
                          onChange={e => setProductFilter({...productFilter, seller: e.target.value})}
                      >
                          <option value="" className="bg-[#F9FAFB]">All Partners</option>
                          {Array.from(new Set(products.map(p => p.farmer || p.farmerName))).filter(Boolean).map(s => (
                              <option key={s} value={s} className="bg-[#F9FAFB]">{s}</option>
                          ))}
                      </select>
                      <Store className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B7280] pointer-events-none" size={16} />
                    </div>
                </div>
            </div>

            <AnimatePresence>
              {isAdding && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }} 
                  animate={{ height: 'auto', opacity: 1 }} 
                  exit={{ height: 0, opacity: 0 }} 
                  className="bg-[#ECECEC] p-10 rounded-[3rem] border border-primary/20 overflow-hidden mb-8 shadow-2xl relative"
                >
                  <div className="flex justify-between items-center mb-10 pb-6 border-b border-[#ECECEC]">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20">
                        {editingProductId ? <Settings size={24} /> : <Plus size={24} />}
                      </div>
                      <h4 className="font-display font-bold text-xl text-[#111111]">{editingProductId ? 'Alter Product Record' : 'Curate New Offering'}</h4>
                    </div>
                    <button onClick={() => {
                        setIsAdding(false);
                        setEditingProductId(null);
                    }} className="w-12 h-12 bg-[#ECECEC] rounded-2xl flex items-center justify-center text-[#6B7280] hover:text-[#111111] hover:border-[#ECECEC] border border-transparent transition-all">
                      <X size={24} />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-8">
                    <div className="col-span-2 lg:col-span-1">
                      <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.25em] block mb-3 ml-2">Name (Bangla)</label>
                      <input 
                        placeholder="ভোরের তাজা সবজি" 
                        className="w-full px-6 py-5 bg-[#FFFFFF] border border-[#ECECEC] rounded-[1.5rem] text-sm text-[#111111] outline-none focus:border-primary/40 transition-all font-medium"
                        value={newProduct.name}
                        onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                      />
                    </div>
                    <div className="col-span-2 lg:col-span-1">
                      <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.25em] block mb-3 ml-2">Name (English)</label>
                      <input 
                        placeholder="Fresh Garden Produce" 
                        className="w-full px-6 py-5 bg-[#FFFFFF] border border-[#ECECEC] rounded-[1.5rem] text-sm text-[#111111] outline-none focus:border-primary/40 transition-all font-medium"
                        value={newProduct.nameEn}
                        onChange={e => setNewProduct({...newProduct, nameEn: e.target.value})}
                      />
                    </div>
                    
                    <div className="col-span-1">
                        <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.25em] block mb-3 ml-2">Appraisal Value (৳)</label>
                        <input 
                          type="number"
                          placeholder="Price per unit" 
                          className="w-full px-6 py-5 bg-[#FFFFFF] border border-[#ECECEC] rounded-[1.5rem] text-sm text-[#111111] outline-none focus:border-primary/40 transition-all font-mono font-bold"
                          value={newProduct.price}
                          onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                        />
                    </div>
                    <div className="col-span-1">
                        <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.25em] block mb-3 ml-2">Privileged Rate (Optional)</label>
                        <input 
                          type="number"
                          placeholder="Discounted Price" 
                          className="w-full px-6 py-5 bg-[#FFFFFF] border border-[#ECECEC] rounded-[1.5rem] text-sm text-[#111111] outline-none focus:border-primary/40 transition-all font-mono font-bold"
                          value={newProduct.discountPrice}
                          onChange={e => setNewProduct({...newProduct, discountPrice: e.target.value})}
                        />
                    </div>

                    <div className="col-span-1">
                      <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.25em] block mb-3 ml-2">Collection</label>
                      <div className="relative">
                        <select 
                          className="w-full px-6 py-5 bg-[#FFFFFF] border border-[#ECECEC] rounded-[1.5rem] text-sm text-[#111111] outline-none focus:border-primary/40 appearance-none transition-all"
                          value={newProduct.category}
                          onChange={e => setNewProduct({...newProduct, category: e.target.value, subCategory: ''})}
                        >
                          <option value="" className="bg-[#F9FAFB]">Select Collection</option>
                          {categories.map(c => <option key={c.id} value={c.title} className="bg-[#F9FAFB]">{c.title}</option>)}
                        </select>
                        <Layers className="absolute right-6 top-1/2 -translate-y-1/2 text-[#6B7280] pointer-events-none" size={16} />
                      </div>
                    </div>
                    <div className="col-span-1">
                      <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.25em] block mb-3 ml-2">Niche / Origin</label>
                      <div className="relative">
                        <select 
                          className="w-full px-6 py-5 bg-[#FFFFFF] border border-[#ECECEC] rounded-[1.5rem] text-sm text-[#111111] outline-none appearance-none focus:border-primary/40 transition-all"
                          value={newProduct.subCategory}
                          onChange={e => setNewProduct({...newProduct, subCategory: e.target.value})}
                        >
                          <option value="" className="bg-[#F9FAFB]">Select Sub-Category</option>
                          {categories.find(c => c.title === newProduct.category)?.subCategories?.map((sub: string) => (
                            <option key={sub} value={sub} className="bg-[#F9FAFB]">{sub}</option>
                          ))}
                        </select>
                        <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 text-[#6B7280] pointer-events-none" size={16} />
                      </div>
                    </div>

                    <div className="col-span-2">
                        <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.25em] block mb-3 ml-2">Visual Heritage (Image Source)</label>
                        <input 
                          placeholder="Public URI for high-res visual..." 
                          className="w-full px-6 py-5 bg-[#FFFFFF] border border-[#ECECEC] rounded-[1.5rem] text-sm text-[#111111] outline-none focus:border-primary/40 transition-all font-mono"
                          value={newProduct.image}
                          onChange={e => setNewProduct({...newProduct, image: e.target.value})}
                        />
                    </div>

                    <div className="col-span-2">
                      <ImageUpload 
                        onUpload={url => setNewProduct({...newProduct, image: url})} 
                        label="Source Media Asset" 
                        currentImage={newProduct.image}
                      />
                    </div>

                    <div className="col-span-1">
                        <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.25em] block mb-3 ml-2">Direct Hub contact</label>
                        <div className="relative">
                          <MessageSquare className="absolute left-6 top-1/2 -translate-y-1/2 text-[#6B7280]" size={18} />
                          <input 
                            placeholder="+8801..." 
                            className="w-full pl-14 pr-6 py-5 bg-[#FFFFFF] border border-[#ECECEC] rounded-[1.5rem] text-sm text-[#111111] outline-none focus:border-primary/40 transition-all"
                            value={newProduct.whatsappNumber}
                            onChange={e => setNewProduct({...newProduct, whatsappNumber: e.target.value})}
                          />
                        </div>
                    </div>
                    <div className="col-span-1">
                        <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.25em] block mb-3 ml-2">Sales Trajectory</label>
                        <div className="relative">
                          <TrendingUp className="absolute left-6 top-1/2 -translate-y-1/2 text-[#6B7280]" size={18} />
                          <input 
                            type="number"
                            placeholder="Initial Sales Volume" 
                            className="w-full pl-14 pr-6 py-5 bg-[#FFFFFF] border border-[#ECECEC] rounded-[1.5rem] text-sm text-[#111111] outline-none focus:border-primary/40 transition-all font-mono"
                            value={newProduct.salesCount}
                            onChange={e => setNewProduct({...newProduct, salesCount: e.target.value})}
                          />
                        </div>
                    </div>
                    <div className="col-span-1">
                        <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.25em] block mb-3 ml-2">Pricing Context</label>
                        <div className="flex gap-2">
                           <button 
                             type="button"
                             onClick={() => setNewProduct({...newProduct, pricingType: 'weight', unit: 'kg'})}
                             className={`flex-1 py-4 rounded-2xl text-[8px] font-black uppercase tracking-widest border transition-all ${newProduct.pricingType === 'weight' ? 'bg-primary text-black border-primary' : 'bg-[#ECECEC] text-[#6B7280] border-[#ECECEC]'}`}
                           >
                             Weight Based
                           </button>
                           <button 
                             type="button"
                             onClick={() => setNewProduct({...newProduct, pricingType: 'piece', unit: 'kg'})}
                             className={`flex-1 py-4 rounded-2xl text-[8px] font-black uppercase tracking-widest border transition-all ${newProduct.pricingType === 'piece' && newProduct.unit === 'kg' ? 'bg-primary text-black border-primary' : 'bg-[#ECECEC] text-[#6B7280] border-[#ECECEC]'}`}
                           >
                             Fixed Unit
                           </button>
                           <button 
                             type="button"
                             onClick={() => setNewProduct({...newProduct, pricingType: 'piece', unit: 'piece'})}
                             className={`flex-1 py-4 rounded-2xl text-[8px] font-black uppercase tracking-widest border transition-all ${newProduct.pricingType === 'piece' && newProduct.unit !== 'kg' ? 'bg-primary text-black border-primary' : 'bg-[#ECECEC] text-[#6B7280] border-[#ECECEC]'}`}
                           >
                             Per Piece
                           </button>
                        </div>
                    </div>

                    <div className="col-span-1">
                        <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.25em] block mb-3 ml-2">Sale Unit (e.g. pkt, box, kg)</label>
                        <div className="relative">
                          <input 
                            placeholder="Unit name..." 
                            className="w-full px-6 py-5 bg-[#FFFFFF] border border-[#ECECEC] rounded-[1.5rem] text-sm text-[#111111] outline-none focus:border-primary/40 transition-all font-mono"
                            value={newProduct.unit}
                            onChange={e => setNewProduct({...newProduct, unit: e.target.value})}
                          />
                        </div>
                    </div>

                    {newProduct.pricingType === 'weight' && (
                      <>
                        <div className="col-span-1">
                            <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.25em] block mb-3 ml-2">Min Order Qty (Grams/Unit)</label>
                            <input 
                              type="number"
                              placeholder="e.g. 100 for 100g" 
                              className="w-full px-6 py-5 bg-[#FFFFFF] border border-[#ECECEC] rounded-[1.5rem] text-sm text-[#111111] outline-none focus:border-primary/40 transition-all font-mono"
                              value={newProduct.minWeight}
                              onChange={e => setNewProduct({...newProduct, minWeight: e.target.value})}
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.25em] block mb-3 ml-2">Allowed Options (Separated by comma)</label>
                            <input 
                              placeholder="100g, 250g, 500g, 1kg" 
                              className="w-full px-6 py-5 bg-[#FFFFFF] border border-[#ECECEC] rounded-[1.5rem] text-sm text-[#111111] outline-none focus:border-primary/40 transition-all"
                              value={newProduct.allowedWeights}
                              onChange={e => setNewProduct({...newProduct, allowedWeights: e.target.value})}
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.25em] block mb-3 ml-2">Base Weight (Default selection in grams)</label>
                            <input 
                              type="number"
                              placeholder="e.g. 250" 
                              className="w-full px-6 py-5 bg-[#FFFFFF] border border-[#ECECEC] rounded-[1.5rem] text-sm text-[#111111] outline-none focus:border-primary/40 transition-all font-mono"
                              value={newProduct.defaultWeight}
                              onChange={e => setNewProduct({...newProduct, defaultWeight: e.target.value})}
                            />
                        </div>
                      </>
                    )}

                    <div className="col-span-1">
                         <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.25em] block mb-3 ml-2">Inventory Threshold (Alert)</label>
                         <input 
                           type="number"
                           placeholder="Alert when stock below..." 
                           className="w-full px-6 py-5 bg-[#FFFFFF] border border-[#ECECEC] rounded-[1.5rem] text-sm text-[#111111] outline-none focus:border-primary/40 transition-all font-mono"
                           value={newProduct.lowStockAlert}
                           onChange={e => setNewProduct({...newProduct, lowStockAlert: e.target.value})}
                         />
                    </div>

                    <div className="col-span-1">
                        <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.25em] block mb-3 ml-2">Registry Supply</label>
                        <div className="relative">
                          <Box className="absolute left-6 top-1/2 -translate-y-1/2 text-[#6B7280]" size={18} />
                          <input 
                            type="number"
                            placeholder="Available Stock" 
                            className="w-full pl-14 pr-6 py-5 bg-[#FFFFFF] border border-[#ECECEC] rounded-[1.5rem] text-sm text-[#111111] outline-none focus:border-primary/40 transition-all"
                            value={newProduct.stockQuantity}
                            onChange={e => setNewProduct({...newProduct, stockQuantity: e.target.value})}
                          />
                        </div>
                    </div>

                    <div className="col-span-2 space-y-4 pt-4">
                        <label className="flex items-center gap-5 cursor-pointer bg-[#ECECEC] border border-[#ECECEC] p-6 rounded-[2rem] transition-all hover:border-red-500/30 group">
                            <input 
                                type="checkbox"
                                className="w-6 h-6 accent-red-500 rounded-lg"
                                checked={newProduct.isOutOfStock}
                                onChange={e => setNewProduct({...newProduct, isOutOfStock: e.target.checked})}
                            />
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-[#111111] group-hover:text-red-400 transition-colors">Withdraw from Public Catalog</span>
                                <span className="text-[11px] text-[#6B7280] font-medium tracking-wide">Sets stock status to 'Depleted' and hides from storefront immediately.</span>
                            </div>
                        </label>
                    </div>

                    <div className="col-span-2 space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.25em] block ml-2">Search Keywords / Alternate Names</label>
                            <button 
                                type="button"
                                onClick={() => {
                                    const name = (newProduct.nameEn || newProduct.name).toLowerCase();
                                    const phoneticVariations = [
                                        name.replace(/ch/g, 'c'),
                                        name.replace(/k/g, 'q'),
                                        name.replace(/sh/g, 's'),
                                        name.replace(/ee/g, 'i'),
                                        name.replace(/oo/g, 'u'),
                                        name.replace(/y/g, 'i')
                                    ];
                                    const tokens = name.split(/\s+/);
                                    const permutations = [
                                        name,
                                        ...phoneticVariations,
                                        ...tokens
                                    ].filter((v, i, a) => v && a.indexOf(v) === i);
                                    
                                    const current = newProduct.searchKeywords || '';
                                    const merged = Array.from(new Set([...current.split(',').map(s => s.trim()), ...permutations])).filter(Boolean).join(', ');
                                    setNewProduct({...newProduct, searchKeywords: merged});
                                }}
                                className="text-[8px] font-black text-primary uppercase tracking-widest hover:text-[#111111] transition-colors"
                            >
                                [ Cognitive Suggestion ]
                            </button>
                        </div>
                        <textarea 
                            placeholder="টমেটো, tomato, tmato, tomoto, tometo, tomato local, red tomato" 
                            className="w-full px-6 py-5 bg-[#FFFFFF] border border-[#ECECEC] rounded-[1.5rem] text-sm text-[#111111] outline-none h-24 resize-none focus:border-primary/40 transition-all font-medium"
                            value={newProduct.searchKeywords || ''}
                            onChange={e => setNewProduct({...newProduct, searchKeywords: e.target.value})}
                        />
                        <p className="text-[10px] text-[#6B7280] mt-2 ml-2 font-medium tracking-wide">Enter synonyms, local names, or common misspellings separated by commas.</p>
                    </div>

                    <div className="col-span-2 pt-6 border-t border-[#ECECEC] mt-4">
                        <h5 className="text-[11px] font-black text-[#6B7280] uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                            <Globe size={18} className="text-blue-400" /> Digital Discoverability (SEO)
                        </h5>
                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.25em] block mb-3 ml-2">Market Meta Description</label>
                                <textarea 
                                    placeholder="Craft a narrative for search engine crawlers..." 
                                    className="w-full px-6 py-5 bg-[#FFFFFF] border border-[#ECECEC] rounded-[1.5rem] text-sm text-[#111111] outline-none h-28 resize-none focus:border-primary/40 transition-all font-medium"
                                    value={newProduct.seoDescription || ''}
                                    onChange={e => setNewProduct({...newProduct, seoDescription: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.25em] block mb-3 ml-2">Strategic Keywords</label>
                                <input 
                                    placeholder="e.g. Heirloom, Gaibandha Gold, Pure Harvest" 
                                    className="w-full px-6 py-5 bg-[#FFFFFF] border border-[#ECECEC] rounded-[1.5rem] text-sm text-[#111111] outline-none focus:border-primary/40 transition-all lowercase"
                                    value={newProduct.seoKeywords || ''}
                                    onChange={e => setNewProduct({...newProduct, seoKeywords: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>

                    <button 
                      onClick={handleAddProduct}
                      className="col-span-2 py-6 bg-[#E21E26] text-white rounded-[2.5rem] font-black uppercase tracking-[0.3em] text-[11px] shadow-2xl shadow-[#E21E26]/40 hover:bg-[#B71C1C] transition-all hover:scale-[1.01] active:scale-95 mt-8 border border-[#E21E26]/20"
                    >
                      {editingProductId ? 'Push Manifest Updates' : 'Authorize & Launch Offering'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-between px-4 mb-8">
                <h3 className="font-display font-black text-xl text-[#111111] tracking-tight">System Inventory <span className="text-[#6B7280] ml-2 font-sans font-medium">({filteredProducts.length})</span></h3>
                <button 
                  onClick={() => {
                    if (selectedProducts.length === filteredProducts.length) setSelectedProducts([]);
                    else setSelectedProducts(filteredProducts.map(p => p.id));
                  }}
                  className="text-[11px] font-black text-primary uppercase tracking-[0.25em] hover:brightness-125 transition-all border-b border-primary/20 pb-0.5"
                >
                  {selectedProducts.length === filteredProducts.length ? 'Discard Selection' : 'Omni-Select'}
                </button>
            </div>

            <div className="bg-[#ECECEC] rounded-[3rem] border border-[#ECECEC] shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-[#ECECEC] border-b border-[#ECECEC]">
                                <th className="px-10 py-7 text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em]">Identity</th>
                                <th className="px-10 py-7 text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em]">Guardian</th>
                                <th className="px-10 py-7 text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em]">Sales</th>
                                <th className="px-10 py-7 text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em]">Supply</th>
                                <th className="px-10 py-7 text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em]">Audit Status</th>
                                <th className="px-10 py-7 text-center text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredProducts.map((p) => (
                                <tr key={p.id} className="hover:bg-[#ECECEC] transition-colors group">
                                    <td className="px-10 py-7">
                                        <div className="flex items-center gap-6">
                                            <div className="relative">
                                                <input 
                                                    type="checkbox" 
                                                    className="absolute -left-12 top-1/2 -translate-y-1/2 w-5 h-5 rounded-lg border-[#ECECEC] bg-transparent accent-primary cursor-pointer transition-all"
                                                    checked={selectedProducts.includes(p.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedProducts([...selectedProducts, p.id]);
                                                        else setSelectedProducts(selectedProducts.filter(id => id !== p.id));
                                                    }}
                                                />
                                                <div className="w-16 h-16 rounded-2xl bg-[#F9FAFB] border border-[#ECECEC] overflow-hidden shadow-2xl group-hover:border-primary/40 transition-all p-0.5">
                                                    <img src={p.image} className="w-full h-full object-cover rounded-[0.9rem]" alt={p.name} />
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-[#111111] group-hover:text-primary transition-colors mb-1">{p.nameEn || p.name}</p>
                                                <p className="text-[10px] text-[#6B7280] uppercase font-black tracking-widest">{p.category} <span className="mx-2 opacity-20">|</span> {p.subCategory}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-7">
                                        <p className="text-xs text-[#6B7280] font-bold tracking-wide">{p.farmerName || p.farmer || 'System Admin'}</p>
                                        <p className="text-[9px] text-[#6B7280] font-black uppercase tracking-widest mt-1">Authorized Seller</p>
                                    </td>
                                    <td className="px-10 py-7">
                                        <div className="flex items-center gap-2">
                                            <TrendingUp size={14} className="text-primary" />
                                            <span className="text-sm font-black text-[#111111]">{p.salesCount || 0}</span>
                                        </div>
                                        <p className="text-[9px] text-[#6B7280] font-black uppercase tracking-widest mt-1">Total Sold</p>
                                    </td>
                                    <td className="px-10 py-7">
                                      <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-3">
                                          <Box size={14} className="text-[#6B7280]" />
                                          <input 
                                              type="number"
                                              className={`w-16 bg-[#ECECEC] border rounded-lg text-xs font-black p-2 outline-none text-[#111111] focus:border-primary/40 transition-all ${
                                                  p.stockQuantity <= (p.lowStockAlert || 10) ? 'border-red-500/50' : 'border-[#ECECEC]'
                                              }`}
                                              value={p.stockQuantity || 0}
                                              onChange={(e) => adminService.updateStockStatus(p.id, p.isOutOfStock ? 'Out of Stock' : 'In Stock', Number(e.target.value), p.isOutOfStock || false)}
                                          />
                                          {p.stockQuantity <= (p.lowStockAlert || 10) && !p.isOutOfStock && (
                                              <p className="text-[7px] text-red-500 font-black uppercase tracking-tighter animate-pulse">Low Alert</p>
                                          )}
                                        </div>
                                        <button 
                                          onClick={() => adminService.updateStockStatus(p.id, !p.isOutOfStock ? 'Out of Stock' : 'In Stock', p.stockQuantity || 0, !p.isOutOfStock)}
                                          className={`text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-md transition-all border ${
                                            p.isOutOfStock 
                                              ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                                              : 'bg-green-500/10 text-green-400 border-green-500/20'
                                          }`}
                                        >
                                          {p.isOutOfStock ? 'Depleted' : 'In Supply'}
                                        </button>
                                      </div>
                                    </td>
                                    <td className="px-10 py-7">
                                        <div className="flex flex-col gap-2">
                                          <span className={`text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full text-center border ${
                                              p.status === 'approved' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_15px_-5px_rgba(59,130,246,0.5)]' :
                                              p.status === 'pending' ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_-5px_rgba(251,191,36,0.5)]' :
                                              'bg-red-500/10 text-red-500 border border-red-500/20'
                                          }`}>
                                              {p.status}
                                          </span>
                                          <p className="text-[10px] font-black text-primary text-center">৳{formatCurrency(p.price)} <span className="text-[#6B7280] font-sans">/ {p.unit}</span></p>
                                        </div>
                                    </td>
                                    <td className="px-10 py-7">
                                        <div className="flex items-center justify-center gap-4">
                                            <button 
                                              onClick={() => adminService.updateProduct(p.id, { status: p.status === 'hidden' ? 'approved' : 'hidden' })}
                                              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all border shadow-xl ${
                                                p.status === 'hidden' ? 'bg-[#ECECEC] border-[#ECECEC] text-[#6B7280]' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                                              }`}
                                              title={p.status === 'hidden' ? 'Release from Archive' : 'Move to Archive'}
                                            >
                                              {p.status === 'hidden' ? <EyeOff size={20} /> : <Eye size={20} />}
                                            </button>
                                            <button 
                                                onClick={() => startEditingProduct(p)}
                                                className="w-12 h-12 bg-[#ECECEC] border border-[#ECECEC] rounded-2xl flex items-center justify-center text-[#6B7280] hover:text-primary hover:border-primary/40 transition-all shadow-xl active:scale-90"
                                            >
                                                <Settings size={20} />
                                            </button>
                                            <button 
                                                onClick={() => adminService.deleteProduct(p.id)}
                                                className="w-12 h-12 bg-[#ECECEC] border border-[#ECECEC] rounded-2xl flex items-center justify-center text-[#6B7280] hover:text-red-500 hover:border-red-500/40 transition-all shadow-xl active:scale-90"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredProducts.length === 0 && (
                    <div className="text-center py-32 bg-[#ECECEC]">
                        <p className="text-[11px] font-black text-[#6B7280] uppercase tracking-[0.5em]">Inventory Registry Empty</p>
                    </div>
                )}
            </div>
          </motion.div>
        )}

        {activeTab === 'banners' && (
          <motion.div key="banners" className="space-y-6">
            <button 
              onClick={() => setIsAdding(true)}
              className="w-full py-5 bg-primary text-black rounded-[2.5rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl hover:scale-[1.01] transition-all flex items-center justify-center gap-3 active:scale-95"
            >
              <Plus size={22} /> Add New Promotional Banner
            </button>

            <AnimatePresence>
              {isAdding && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-[#ECECEC] p-10 rounded-[3rem] border border-primary/20 overflow-hidden mb-8 shadow-2xl">
                  <div className="flex justify-between items-center mb-8 pb-4 border-b border-[#ECECEC]">
                    <h4 className="font-display font-bold text-lg text-[#111111] uppercase tracking-widest">Banner Configuration</h4>
                    <button onClick={() => setIsAdding(false)} className="w-10 h-10 bg-[#ECECEC] rounded-full flex items-center justify-center text-[#6B7280] hover:text-[#111111] transition-colors">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-2">
                            <label className="text-[9px] font-black text-[#6B7280] uppercase tracking-[0.2em] block mb-2 ml-2">Header Title</label>
                            <input 
                              placeholder="Title (Optional)" 
                              className="w-full px-5 py-4 bg-[#FFFFFF] border border-[#ECECEC] rounded-2xl text-sm text-[#111111] outline-none focus:border-primary/40 transition-all shadow-inner"
                              value={newBanner.title}
                              onChange={e => setNewBanner({...newBanner, title: e.target.value})}
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="text-[9px] font-black text-[#6B7280] uppercase tracking-[0.2em] block mb-2 ml-2">Call to Action Subtitle</label>
                            <input 
                              placeholder="Subtitle (Optional)" 
                              className="w-full px-5 py-4 bg-[#FFFFFF] border border-[#ECECEC] rounded-2xl text-sm text-[#111111] outline-none focus:border-primary/40 transition-all shadow-inner"
                              value={newBanner.subtitle}
                              onChange={e => setNewBanner({...newBanner, subtitle: e.target.value})}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-[9px] font-black text-[#6B7280] uppercase tracking-[0.2em] block mb-2 ml-2">Visual Heritage (6:4 Ratio Recommended)</label>
                        <ImageUpload 
                            label="Launch Banner Visual"
                            currentImage={newBanner.image}
                            onUpload={(base64) => setNewBanner({...newBanner, image: base64})}
                        />
                    </div>
                    <button 
                      onClick={handleAddBanner} 
                      className="w-full py-5 bg-primary text-black rounded-[2rem] font-black uppercase tracking-[0.3em] text-[10px] shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all mt-4"
                    >
                      Publish Banner to Live Store
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {banners.map((item) => (
                <div key={item.id} className="bg-[#ECECEC] p-4 rounded-[2.5rem] border border-[#ECECEC] flex items-center justify-between group hover:border-primary/20 transition-all shadow-2xl">
                  <div className="flex items-center gap-5">
                    <div className="w-24 h-16 bg-[#F9FAFB] rounded-2xl overflow-hidden border border-[#ECECEC] shadow-2xl group-hover:border-primary/40 transition-all">
                      <img src={item.image} className="w-full h-full object-cover" alt={item.title} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#111111] group-hover:text-primary transition-colors">{item.title || 'Master Visual'}</h4>
                      <p className="text-[10px] font-black text-[#6B7280] uppercase tracking-widest mt-1">{item.subtitle || 'Promotional Event'}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => adminService.deleteBanner(item.id)}
                    className="w-11 h-11 bg-[#ECECEC] border border-[#ECECEC] rounded-2xl flex items-center justify-center text-[#6B7280] hover:text-red-500 hover:border-red-500/40 transition-all active:scale-90"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </div>
            {banners.length === 0 && (
              <div className="text-center py-20 bg-[#ECECEC] rounded-[3rem] border border-dashed border-[#ECECEC]">
                <p className="text-[11px] font-black text-[#6B7280] uppercase tracking-[0.4em]">No Live Banners</p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'stories' && (
            <motion.div key="stories" className="space-y-6">
                <button 
                  onClick={() => setIsAdding(true)} 
                  className="w-full py-5 bg-primary text-black rounded-[2.5rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl hover:scale-[1.01] transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                    <Plus size={22} /> Share New Brand Story
                </button>

                <AnimatePresence>
                  {isAdding && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-[#ECECEC] p-10 rounded-[3rem] border border-primary/20 overflow-hidden mb-8 shadow-2xl">
                      <div className="flex justify-between items-center mb-8 pb-4 border-b border-[#ECECEC]">
                        <h4 className="font-display font-bold text-lg text-[#111111] uppercase tracking-widest">Story Manifest</h4>
                        <button onClick={() => setIsAdding(false)} className="w-10 h-10 bg-[#ECECEC] rounded-full flex items-center justify-center text-[#6B7280] hover:text-[#111111] transition-colors">
                          <X size={20} />
                        </button>
                      </div>
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="col-span-2 lg:col-span-1">
                                <label className="text-[9px] font-black text-[#6B7280] uppercase tracking-[0.2em] block mb-2 ml-2">Author / Protagonist</label>
                                <input 
                                  placeholder="e.g. Kashem Miya" 
                                  className="w-full px-5 py-4 bg-[#FFFFFF] border border-[#ECECEC] rounded-2xl text-sm text-[#111111] outline-none focus:border-primary/40 transition-all font-medium"
                                  value={newStory.name}
                                  onChange={e => setNewStory({...newStory, name: e.target.value})}
                                />
                            </div>
                            <div className="col-span-2 lg:col-span-1">
                                <label className="text-[9px] font-black text-[#6B7280] uppercase tracking-[0.2em] block mb-2 ml-2">Classification</label>
                                <div className="flex gap-2">
                                  {['Farmer', 'Customer', 'Seller'].map(type => (
                                    <button 
                                      key={type}
                                      onClick={() => setNewStory({...newStory, type})}
                                      className={`flex-1 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${newStory.type === type ? 'bg-primary text-black border-primary' : 'bg-[#ECECEC] text-[#6B7280] border-[#ECECEC] hover:border-[#ECECEC]'}`}
                                    >
                                      {type === 'Farmer' ? 'Merchant' : type}
                                    </button>
                                  ))}
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-[#6B7280] uppercase tracking-[0.2em] block mb-2 ml-2">Authentic Narrative / Quote</label>
                            <textarea 
                              placeholder="Share the heritage or testimonial..." 
                              className="w-full px-5 py-4 bg-[#FFFFFF] border border-[#ECECEC] rounded-2xl text-sm text-[#111111] outline-none focus:border-primary/40 h-28 resize-none transition-all font-medium"
                              value={newStory.quote}
                              onChange={e => setNewStory({...newStory, quote: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-[#6B7280] uppercase tracking-[0.2em] block mb-2 ml-2">Portrait Visual</label>
                            <ImageUpload 
                                label="Upload Identity Asset"
                                currentImage={newStory.image}
                                onUpload={(base64) => setNewStory({...newStory, image: base64})}
                            />
                        </div>
                        <button 
                          onClick={handleAddStory} 
                          className="w-full py-5 bg-primary text-black rounded-[2rem] font-black uppercase tracking-[0.3em] text-[10px] shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all mt-4"
                        >
                          Publish Story to Community
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {stories.map((item) => (
                        <div key={item.id} className="aspect-[3/4.5] bg-[#F9FAFB] rounded-[2.5rem] border border-[#ECECEC] overflow-hidden relative group shadow-2xl">
                            <img src={item.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={item.name} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80" />
                            <div className="absolute inset-x-0 bottom-0 p-5 z-10">
                                <span className="text-[8px] font-black tracking-widest bg-primary text-black px-3 py-1 rounded-full uppercase mb-2 inline-block shadow-lg">
                                    {item.type}
                                </span>
                                <h4 className="text-sm font-black text-[#111111] tracking-wide truncate">{item.name}</h4>
                                <p className="text-[9px] text-[#6B7280] line-clamp-2 mt-1 font-medium">{item.quote}</p>
                            </div>
                            <button 
                              onClick={() => adminService.deleteStory(item.id)}
                              className="absolute top-4 right-4 w-10 h-10 bg-[#FFFFFF] backdrop-blur-md rounded-2xl text-[#6B7280] hover:text-red-500 flex items-center justify-center transition-all border border-[#ECECEC] active:scale-90"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                </div>
                {stories.length === 0 && (
                    <div className="text-center py-20 bg-[#ECECEC] rounded-[3rem] border border-dashed border-[#ECECEC]">
                        <p className="text-[11px] font-black text-[#6B7280] uppercase tracking-[0.4em]">No Stories in Registry</p>
                    </div>
                )}
            </motion.div>
        )}

        {activeTab === 'categories' && (
            <motion.div key="categories" className="space-y-6">
                <button 
                  onClick={() => setIsAdding(true)} 
                  className="w-full py-5 bg-primary text-black rounded-[2.5rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl hover:scale-[1.01] transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                    <Plus size={22} /> Define New Department
                </button>

                <AnimatePresence>
                  {isAdding && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-[#ECECEC] p-10 rounded-[3rem] border border-primary/20 overflow-hidden mb-8 shadow-2xl">
                      <div className="flex justify-between items-center mb-8 pb-4 border-b border-[#ECECEC]">
                        <h4 className="font-display font-bold text-lg text-[#111111] uppercase tracking-widest">Department Registry</h4>
                        <button onClick={() => setIsAdding(false)} className="w-10 h-10 bg-[#ECECEC] rounded-full flex items-center justify-center text-[#6B7280] hover:text-[#111111] transition-colors">
                          <X size={20} />
                        </button>
                      </div>
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="col-span-2 lg:col-span-1">
                                <label className="text-[9px] font-black text-[#6B7280] uppercase tracking-[0.2em] block mb-2 ml-2">Display Title (Bangla)</label>
                                <input 
                                  placeholder="e.g. সবজি বাগান" 
                                  className="w-full px-5 py-4 bg-[#FFFFFF] border border-[#ECECEC] rounded-2xl text-sm text-[#111111] outline-none focus:border-primary/40 transition-all font-medium"
                                  value={newCategory.title}
                                  onChange={e => setNewCategory({...newCategory, title: e.target.value})}
                                />
                            </div>
                            <div className="col-span-2 lg:col-span-1">
                                <label className="text-[9px] font-black text-[#6B7280] uppercase tracking-[0.2em] block mb-2 ml-2">Display Title (English)</label>
                                <input 
                                  placeholder="e.g. Fresh Vegetables" 
                                  className="w-full px-5 py-4 bg-[#FFFFFF] border border-[#ECECEC] rounded-2xl text-sm text-[#111111] outline-none focus:border-primary/40 transition-all font-medium"
                                  value={newCategory.titleEn}
                                  onChange={e => setNewCategory({...newCategory, titleEn: e.target.value})}
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="text-[9px] font-black text-[#6B7280] uppercase tracking-[0.2em] block mb-2 ml-2">Institutional Sales Volume</label>
                                <input 
                                  type="number"
                                  placeholder="Initial aggregate sales..." 
                                  className="w-full px-5 py-4 bg-[#FFFFFF] border border-[#ECECEC] rounded-2xl text-sm text-[#111111] outline-none focus:border-primary/40 transition-all font-mono"
                                  value={newCategory.salesCount}
                                  onChange={e => setNewCategory({...newCategory, salesCount: e.target.value})}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-[#6B7280] uppercase tracking-[0.2em] block mb-2 ml-2">Iconography Visual</label>
                            <ImageUpload 
                                label="Upload Category Emblem"
                                currentImage={newCategory.image}
                                onUpload={(base64) => setNewCategory({...newCategory, image: base64})}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="col-span-2">
                                <label className="text-[9px] font-black text-[#6B7280] uppercase tracking-[0.2em] block mb-2 ml-2">Niche Collections (Bangla, comma separated)</label>
                                <input 
                                  placeholder="e.g. আলু, বেগুন, মরিচ" 
                                  className="w-full px-5 py-4 bg-[#FFFFFF] border border-[#ECECEC] rounded-2xl text-[13px] text-[#111111] outline-none focus:border-primary/40 transition-all"
                                  value={newCategory.subCategories}
                                  onChange={e => setNewCategory({...newCategory, subCategories: e.target.value})}
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="text-[9px] font-black text-[#6B7280] uppercase tracking-[0.2em] block mb-2 ml-2">Niche Collections (English, comma separated)</label>
                                <input 
                                  placeholder="e.g. Potato, Brinjal, Chilli" 
                                  className="w-full px-5 py-4 bg-[#FFFFFF] border border-[#ECECEC] rounded-2xl text-[13px] text-[#111111] outline-none focus:border-primary/40 transition-all"
                                  value={newCategory.subCategoriesEn}
                                  onChange={e => setNewCategory({...newCategory, subCategoriesEn: e.target.value})}
                                />
                            </div>
                        </div>
                        <button 
                          onClick={handleAddCategory} 
                          className="w-full py-5 bg-primary text-black rounded-[2rem] font-black uppercase tracking-[0.3em] text-[10px] shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all mt-4"
                        >
                          Register Department
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="bg-[#ECECEC] rounded-[3rem] border border-[#ECECEC] shadow-2xl overflow-hidden divide-y divide-white/5">
                    {categories.map((cat) => (
                        <div key={cat.id} className="flex flex-col">
                            <div className="p-8 flex items-center justify-between transition-colors hover:bg-[#ECECEC]">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 bg-[#F9FAFB] border border-[#ECECEC] rounded-[1.5rem] overflow-hidden shadow-2xl p-0.5">
                                      <img src={cat.image} className="w-full h-full object-cover rounded-[1.3rem]" alt={cat.title} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-base font-black text-[#111111] group-hover:text-primary transition-colors tracking-tight">{cat.title}</span>
                                        <div className="flex items-center gap-2 mt-1">
                                          <p className="text-[10px] text-[#6B7280] font-black uppercase tracking-widest">
                                              {cat.subCategories?.length || 0} Niche Collections
                                          </p>
                                          <span className="w-1 h-1 bg-[#ECECEC] rounded-full" />
                                          <p className="text-[10px] text-primary/60 font-medium italic">{(cat as any).titleEn}</p>
                                          <span className="w-1 h-1 bg-[#ECECEC] rounded-full" />
                                          <p className="text-[10px] text-green-400/60 font-black tracking-widest">
                                              SALES: {cat.salesCount || 0}
                                          </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button 
                                      onClick={() => setEditingCategory(editingCategory === cat.id ? null : cat.id)}
                                      className={`w-12 h-12 rounded-2xl transition-all flex items-center justify-center border ${editingCategory === cat.id ? 'bg-primary border-primary text-black' : 'bg-[#ECECEC] border-[#ECECEC] text-[#6B7280] hover:text-[#111111] hover:border-[#ECECEC]'}`}
                                    >
                                        <Settings size={22} />
                                    </button>
                                    <button 
                                      onClick={() => adminService.deleteCategory(cat.id)}
                                      className="w-12 h-12 bg-[#ECECEC] border border-[#ECECEC] rounded-2xl flex items-center justify-center text-[#6B7280] hover:text-red-500 hover:border-red-500/40 transition-all active:scale-90"
                                    >
                                        <Trash2 size={22} />
                                    </button>
                                </div>
                            </div>
                            
                            <AnimatePresence>
                                {editingCategory === cat.id && (
                                    <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="px-10 pb-10 bg-black/5"
                                    >
                                        <div className="pt-6 space-y-6">
                                            <div className="flex flex-wrap gap-3">
                                                {cat.subCategories?.map((sub: string) => (
                                                    <div key={sub} className="group flex items-center gap-2 bg-[#ECECEC] border border-[#ECECEC] px-4 py-2 rounded-xl transition-all hover:border-primary/30">
                                                        <span className="text-[11px] font-black text-[#6B7280] tracking-wide">{sub}</span>
                                                        <button 
                                                            onClick={() => handleRemoveSubCategory(cat.id, cat.subCategories, sub)}
                                                            className="text-[#6B7280] hover:text-red-400 transition-colors"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                            
                                            <div className="flex gap-4">
                                                <input 
                                                    placeholder="Inject new sub-collection..." 
                                                    className="flex-1 px-6 py-4 bg-[#FFFFFF] border border-[#ECECEC] rounded-2xl text-xs text-[#111111] outline-none focus:border-primary/40 transition-all"
                                                    value={newSubCategory}
                                                    onChange={e => setNewSubCategory(e.target.value)}
                                                    onKeyPress={e => e.key === 'Enter' && handleAddSubCategory(cat.id, cat.subCategories)}
                                                />
                                                <button 
                                                    onClick={() => handleAddSubCategory(cat.id, cat.subCategories)}
                                                    className="px-8 bg-primary text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all"
                                                >
                                                    Authorize
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            </motion.div>
        )}

        {activeTab === 'riders' && (
          <motion.div key="riders-management" className="space-y-8">
            <div className="flex items-center justify-between px-2">
                <h3 className="font-display font-black text-2xl text-[#111111] tracking-tight">Delivery Elite Force</h3>
                <span className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] bg-[#ECECEC] px-4 py-1.5 rounded-full border border-[#ECECEC]">
                  Registry: {sellers.filter(u => u.role === 'rider').length} Active
                </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sellers.filter(u => u.role === 'rider').map((rider) => (
                <div key={rider.id} className="bg-[#ECECEC] p-8 rounded-[3rem] border border-[#ECECEC] shadow-2xl relative overflow-hidden group hover:border-primary/20 transition-all">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-primary/10 transition-all" />
                  
                  <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="w-24 h-24 bg-[#F9FAFB] rounded-[2.5rem] border border-[#ECECEC] flex items-center justify-center text-primary shadow-2xl mb-6 group-hover:border-primary/40 transition-all p-1">
                      {rider.photoURL ? (
                        <img src={rider.photoURL} className="w-full h-full object-cover rounded-[2.2rem]" alt="" />
                      ) : (
                        <div className="w-full h-full bg-[#ECECEC] rounded-[2.2rem] flex items-center justify-center">
                          <User size={32} />
                        </div>
                      )}
                    </div>
                    
                    <h4 className="font-display font-bold text-lg text-[#111111] mb-1 group-hover:text-primary transition-colors">{rider.realName || rider.displayName}</h4>
                    <p className="text-[10px] text-[#6B7280] font-black uppercase tracking-[0.25em] mb-4">{rider.phone || 'Registry Unverified'}</p>
                    
                    <div className="flex items-center gap-3 mb-8">
                      <span className={`text-[8px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border ${
                        rider.isVerified 
                          ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                          : 'bg-red-500/10 text-red-500 border-red-500/20'
                      }`}>
                        {rider.isVerified ? 'Elite Verified' : 'Audit Pending'}
                      </span>
                      <span className={`text-[8px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border ${
                        rider.status === 'online' 
                          ? 'bg-primary/10 text-primary border-primary/20' 
                          : 'bg-[#ECECEC] text-[#6B7280] border-[#ECECEC]'
                      }`}>
                        {rider.status || 'Offline'}
                      </span>
                    </div>

                    <div className="flex flex-col w-full gap-3">
                        {!rider.isVerified && (
                          <button 
                            onClick={() => adminService.updateUserRole(rider.id, 'rider', true)}
                            className="w-full py-5 bg-primary text-black rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.3em] shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95"
                          >
                            Authorize & Verify
                          </button>
                        )}
                        <button 
                          onClick={() => adminService.deleteUser(rider.id)}
                          className="w-full py-4 bg-[#ECECEC] border border-[#ECECEC] rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] text-[#6B7280] hover:text-red-500 hover:border-red-500/40 transition-all flex items-center justify-center gap-2"
                        >
                          <Trash2 size={16} /> Decommission Partner
                        </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {sellers.filter(u => u.role === 'rider').length === 0 && (
                <div className="text-center py-32 bg-[#ECECEC] rounded-[3rem] border border-dashed border-[#ECECEC]">
                    <p className="text-[11px] font-black text-[#6B7280] uppercase tracking-[0.5em]">No Delivery Partners Found</p>
                </div>
            )}
          </motion.div>
        )}

        {activeTab === 'users' && (
            <motion.div key="users" className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between px-2 gap-4">
                    <div>
                        <h2 className="font-display font-black text-3xl text-[#111111] tracking-tight">Citizen Directory</h2>
                        <p className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.2em] mt-1">Unified Collective: {sellers.length} registered nodes</p>
                    </div>
                    
                    <div className="flex bg-[#ECECEC] p-1.5 rounded-2xl border border-[#ECECEC]">
                        {[
                            { id: 'all', label: 'All Agents' },
                            { id: 'push_enabled', label: 'Push Sync' },
                            { id: 'push_disabled', label: 'Blocked' },
                            { id: 'pending', label: 'Neutral' }
                        ].map((f) => (
                            <button
                                key={f.id}
                                onClick={() => setUserFilter(f.id as any)}
                                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                    userFilter === f.id ? 'bg-primary text-black' : 'text-[#6B7280] hover:text-[#6B7280]'
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {sellers
                      .filter(u => {
                          if (userFilter === 'push_enabled') return u.pushEnabled === true;
                          if (userFilter === 'push_disabled') return u.pushEnabled === false;
                          if (userFilter === 'pending') return u.pushEnabled === undefined;
                          return true;
                      })
                      .map((u) => (
                        <div key={u.id} className="bg-[#ECECEC] p-8 rounded-[3rem] border border-[#ECECEC] transition-all hover:bg-white/[0.07] hover:border-primary/20 group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl opacity-0 group-hover:opacity-100 transition-all duration-700" />
                            
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 relative z-10">
                                <div className="flex items-center gap-8">
                                    <div className={`w-20 h-20 rounded-[2rem] border shadow-2xl flex items-center justify-center transition-all group-hover:scale-105 ${
                                        u.role === 'admin' ? 'bg-primary border-primary text-black' : 
                                        u.role === 'seller' ? 'bg-[#ECECEC] border-[#ECECEC] text-primary' : 
                                        u.role === 'rider' ? 'bg-[#ECECEC] border-[#ECECEC] text-blue-400' : 
                                        'bg-[#ECECEC] border-[#ECECEC] text-[#6B7280]'
                                    }`}>
                                        {u.role === 'admin' ? <ShieldCheck size={32} /> : 
                                         u.role === 'seller' ? <Store size={32} /> : 
                                         u.role === 'rider' ? <Truck size={32} /> : 
                                         <User size={32} />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h4 className="font-display font-bold text-xl text-[#111111] tracking-wide">{u.displayName || 'Anonymous Citizen'}</h4>
                                            {u.isVerified && <CheckCircle size={18} className="text-primary" />}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-4 mt-2">
                                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{u.role || 'customer'}</span>
                                            <span className="w-1 h-1 bg-[#ECECEC] rounded-full" />
                                            <span className="text-[10px] font-bold text-[#6B7280] tracking-wider font-mono">{u.email}</span>
                                            {u.isBlocked && (
                                                <span className="bg-red-500/20 text-red-500 text-[8px] px-3 py-1 rounded-full font-black uppercase tracking-widest border border-red-500/20">Access Restricted</span>
                                            )}
                                        </div>
                                        {u.payoutAccount && (
                                            <div className="flex items-center gap-3 mt-4 bg-[#FFFFFF] px-4 py-2 rounded-xl border border-[#ECECEC] w-fit">
                                                <span className="text-[8px] font-black text-primary uppercase tracking-widest leading-none">{u.paymentMethod}</span>
                                                <span className="text-[10px] font-mono text-[#6B7280] tracking-wider">{u.payoutAccount}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                                    {!u.isVerified && (u.roleRequest === 'seller' || u.roleRequest === 'rider') && (
                                        <button 
                                            onClick={() => u.roleRequest === 'seller' ? adminService.verifySeller(u.id) : adminService.updateUserRole(u.id, 'rider', true)}
                                            className="px-8 py-4 bg-primary text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-105 transition-all"
                                        >
                                            Authorize Role
                                        </button>
                                    )}
                                    
                                    <div className="flex items-center gap-2 bg-[#FFFFFF] p-2 rounded-2xl border border-[#ECECEC]">
                                        <button 
                                            onClick={() => adminService.blockUser(u.id, !u.isBlocked)}
                                            className={`w-11 h-11 flex items-center justify-center rounded-xl border transition-all ${u.isBlocked ? 'bg-red-500 border-red-500 text-[#111111]' : 'bg-[#ECECEC] border-[#ECECEC] text-[#6B7280] hover:text-red-500 hover:border-red-500/40'}`}
                                            title={u.isBlocked ? "Unblock User" : "Block User"}
                                        >
                                            <XCircle size={20} />
                                        </button>
                                        
                                        {u.email !== 'mehedihasa6682@gmail.com' ? (
                                            <select 
                                                value={u.role || 'customer'}
                                                onChange={(e) => adminService.updateUserRole(u.id, e.target.value)}
                                                className="bg-transparent text-[#111111] text-[10px] font-black uppercase tracking-widest px-4 py-2.5 outline-none cursor-pointer"
                                            >
                                                <option className="bg-zinc-900" value="customer">Customer</option>
                                                <option className="bg-zinc-900" value="seller">Seller</option>
                                                <option className="bg-zinc-900" value="rider">Rider</option>
                                                <option className="bg-zinc-900" value="admin">Admin</option>
                                            </select>
                                        ) : (
                                            <span className="text-[10px] font-black text-primary/40 uppercase tracking-[0.2em] px-4 py-2.5">Founder</span>
                                        )}
                                        
                                        <button 
                                            onClick={() => {
                                                if (u.email === 'mehedihasa6682@gmail.com') {
                                                    alert("Cannot remove primary admin.");
                                                    return;
                                                }
                                                if(confirm("Are you sure you want to delete this user?")) {
                                                    adminService.deleteSeller(u.id);
                                                }
                                            }}
                                            className="w-11 h-11 flex items-center justify-center rounded-xl bg-[#ECECEC] border border-[#ECECEC] text-[#6B7280] hover:text-red-500 hover:border-red-500/40 transition-all active:scale-90"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-8 pt-8 border-t border-[#ECECEC] flex justify-between items-center px-2">
                                <div className="flex gap-12">
                                    <div className="flex flex-col gap-1.5">
                                        <p className="text-[8px] font-black text-[#6B7280] uppercase tracking-[0.3em]">Last Pulse Detected</p>
                                        <p className="text-[11px] font-black text-[#6B7280] tracking-wider font-mono italic">
                                            {u.lastLogin?.toDate ? format(u.lastLogin.toDate(), 'dd MMM yyyy - HH:mm:ss') : 'Pulse Silent'}
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <p className="text-[8px] font-black text-[#6B7280] uppercase tracking-[0.3em]">Citizen ID</p>
                                        <p className="text-[10px] font-mono text-[#6B7280] tracking-tight">{u.id}</p>
                                    </div>
                                </div>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                                            u.pushEnabled === true ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                            u.pushEnabled === false ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                            'bg-[#ECECEC] text-[#6B7280] border-[#ECECEC]'
                                        }`} title={u.pushEnabled === true ? "Neural Link Active" : u.pushEnabled === false ? "Neural Link Severed" : "Neural Link Pending"}>
                                            <Bell size={14} />
                                        </div>
                                        <div className={`w-2 h-2 rounded-full ${u.status === 'online' ? 'bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]' : 'bg-[#ECECEC]'}`} />
                                        <span className="text-[9px] font-black text-[#6B7280] uppercase tracking-widest">{u.status || 'offline'}</span>
                                    </div>
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>
        )}

        {activeTab === 'bundles' && (
            <motion.div key="bundles" className="space-y-8">
                <button 
                    onClick={() => setIsAdding(true)} 
                    className="w-full py-5 bg-primary text-black rounded-[2.5rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl hover:scale-[1.01] transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                    <Plus size={22} /> Orchestrate New Bundle Offer
                </button>

                <AnimatePresence>
                  {isAdding && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-[#ECECEC] p-10 rounded-[3rem] border border-primary/20 overflow-hidden mb-8 shadow-2xl">
                      <div className="flex justify-between items-center mb-8 pb-4 border-b border-[#ECECEC]">
                        <h4 className="font-display font-bold text-lg text-[#111111] uppercase tracking-widest">Bundle Manifest</h4>
                        <button onClick={() => setIsAdding(false)} className="w-10 h-10 bg-[#ECECEC] rounded-full flex items-center justify-center text-[#6B7280] hover:text-[#111111] transition-colors">
                          <X size={20} />
                        </button>
                      </div>
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="col-span-2 lg:col-span-1">
                                <label className="text-[9px] font-black text-[#6B7280] uppercase tracking-[0.2em] block mb-2 ml-2">Bundle Designation (Bangla)</label>
                                <input 
                                  placeholder="e.g. রমজান স্পেশাল" 
                                  className="w-full px-5 py-4 bg-[#FFFFFF] border border-[#ECECEC] rounded-2xl text-sm text-[#111111] outline-none focus:border-primary/40 transition-all"
                                  value={newBundle.name}
                                  onChange={e => setNewBundle({...newBundle, name: e.target.value})}
                                />
                            </div>
                            <div className="col-span-2 lg:col-span-1">
                                <label className="text-[9px] font-black text-[#6B7280] uppercase tracking-[0.2em] block mb-2 ml-2">Bundle Designation (English)</label>
                                <input 
                                  placeholder="e.g. Ramadan Feast" 
                                  className="w-full px-5 py-4 bg-[#FFFFFF] border border-[#ECECEC] rounded-2xl text-sm text-[#111111] outline-none focus:border-primary/40 transition-all font-medium"
                                  value={newBundle.nameEn}
                                  onChange={e => setNewBundle({...newBundle, nameEn: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="col-span-2 lg:col-span-1">
                                <label className="text-[9px] font-black text-[#6B7280] uppercase tracking-[0.2em] block mb-2 ml-2">Appraised Value (৳)</label>
                                <input 
                                  type="number"
                                  placeholder="e.g. 1500" 
                                  className="w-full px-5 py-4 bg-[#FFFFFF] border border-[#ECECEC] rounded-2xl text-sm text-[#111111] outline-none focus:border-primary/40 transition-all font-mono"
                                  value={newBundle.price}
                                  onChange={e => setNewBundle({...newBundle, price: e.target.value})}
                                />
                            </div>
                            <div className="col-span-2 lg:col-span-1">
                                <label className="text-[9px] font-black text-[#6B7280] uppercase tracking-[0.2em] block mb-2 ml-2">Collection Visual</label>
                                <ImageUpload 
                                    label="Upload Bundle Identity Asset"
                                    currentImage={newBundle.image}
                                    onUpload={(base64) => setNewBundle({...newBundle, image: base64})}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-[#6B7280] uppercase tracking-[0.2em] block mb-2 ml-2">Curation Narrative</label>
                            <textarea 
                              placeholder="Describe the items in this exclusive collection..." 
                              className="w-full px-5 py-4 bg-[#FFFFFF] border border-[#ECECEC] rounded-2xl text-sm text-[#111111] outline-none focus:border-primary/40 h-28 resize-none transition-all"
                              value={newBundle.description}
                              onChange={e => setNewBundle({...newBundle, description: e.target.value})}
                            />
                        </div>
                        <button 
                            onClick={handleAddBundle} 
                            className="w-full py-5 bg-primary text-black rounded-[2rem] font-black uppercase tracking-[0.3em] text-[10px] shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all mt-4"
                        >
                            Authorize Collection Placement
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {bundles.map((bundle) => (
                        <div key={bundle.id} className="bg-[#ECECEC] p-6 rounded-[2.5rem] border border-[#ECECEC] flex items-center justify-between shadow-2xl hover:border-primary/20 group transition-all">
                            <div className="flex items-center gap-6">
                                <div className="w-24 h-24 bg-[#F9FAFB] rounded-3xl overflow-hidden border border-[#ECECEC] shadow-2xl p-0.5">
                                    <img src={bundle.image} className="w-full h-full object-cover rounded-[1.4rem]" alt={bundle.name} />
                                </div>
                                <div>
                                    <h4 className="font-display font-bold text-lg text-[#111111] group-hover:text-primary transition-all">{bundle.name}</h4>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-[10px] font-black text-primary tracking-widest uppercase">৳{formatCurrency(bundle.price)}</span>
                                        <span className="w-1 h-1 bg-[#ECECEC] rounded-full" />
                                        <p className="text-[10px] font-medium text-[#6B7280] italic">{(bundle as any).nameEn}</p>
                                    </div>
                                    <p className="text-[9px] text-[#6B7280] mt-2 line-clamp-1 max-w-[200px]">{bundle.description}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => adminService.deleteBundle(bundle.id)}
                                className="w-12 h-12 bg-[#ECECEC] border border-[#ECECEC] rounded-2xl flex items-center justify-center text-[#6B7280] hover:text-red-500 hover:border-red-500/40 transition-all active:scale-90"
                            >
                                <Trash2 size={22} />
                            </button>
                        </div>
                    ))}
                </div>
                {bundles.length === 0 && (
                    <div className="text-center py-32 bg-[#ECECEC] rounded-[3rem] border border-dashed border-[#ECECEC]">
                        <p className="text-[11px] font-black text-[#6B7280] uppercase tracking-[0.5em]">No Bundle Assets in Inventory</p>
                    </div>
                )}
            </motion.div>
        )}

        {activeTab === 'settings' && (
            <motion.div key="settings" className="space-y-10">
                <div className="bg-[#ECECEC] p-10 rounded-[3rem] border border-[#ECECEC] shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full -mr-24 -mt-24 blur-3xl group-hover:bg-blue-500/20 transition-all duration-1000" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/5 rounded-full -ml-24 -mb-24 blur-3xl group-hover:bg-amber-500/10 transition-all duration-1000" />
                    
                    <h3 className="font-display font-black text-2xl mb-8 flex items-center gap-4 text-[#111111] uppercase tracking-[0.2em] relative z-10">
                        <Globe size={28} className="text-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.4)]" />
                        Domain & URL Protection
                    </h3>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 relative z-10">
                        {/* 1. Main Website Domain */}
                        <div className="space-y-6">
                            <div className="p-6 bg-[#FFFFFF] border border-[#ECECEC] rounded-[2rem] space-y-4">
                                <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] flex items-center gap-2">
                                    <ShieldCheck size={14} /> Global Identity Nexus
                                </h4>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-[#6B7280] uppercase tracking-widest ml-2">Primary Authority (Domain)</label>
                                        <input 
                                            placeholder="kichukini.com" 
                                            className="w-full px-6 py-4 bg-[#FFFFFF] border border-[#ECECEC] rounded-2xl text-xs text-[#111111] font-mono outline-none focus:border-blue-500/40 transition-all"
                                            defaultValue={appSettings.primaryDomain || ''}
                                            id="primaryDomain"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between px-3">
                                        <span className="text-[9px] font-bold text-[#6B7280] uppercase tracking-widest">Enforce WWW Redirect</span>
                                        <button 
                                            onClick={() => adminService.updateAppSetting('enforceWww', !appSettings.enforceWww)}
                                            className={`w-12 h-6 rounded-full transition-all relative ${appSettings.enforceWww ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-[#ECECEC]'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${appSettings.enforceWww ? 'right-1' : 'left-1'}`} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* 2. Common Domain Misspellings */}
                            <div className="p-6 bg-[#FFFFFF] border border-[#ECECEC] rounded-[2rem] space-y-4">
                                <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-[0.3em] flex items-center gap-2">
                                    <XCircle size={14} /> Typo-Tolerance Shield
                                </h4>
                                <div className="space-y-3">
                                    <textarea 
                                        placeholder="kicukini, kichukeni, kisu kini..." 
                                        className="w-full px-6 py-4 bg-[#FFFFFF] border border-[#ECECEC] rounded-2xl text-xs text-[#111111] h-24 outline-none focus:border-amber-500/40 transition-all resize-none font-medium leading-relaxed"
                                        defaultValue={appSettings.domainMisspellings || ''}
                                        id="domainMisspellings"
                                    />
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => {
                                                const name = (appSettings.appName || 'kichukini').toLowerCase();
                                                const variations = [
                                                    name.replace(/ch/g, 'c'),
                                                    name.replace(/k/g, 'q'),
                                                    name.replace(/u/g, 'o'),
                                                    name.slice(0, -1),
                                                    name.split('').join(' '),
                                                    name.replace(/i/g, 'y')
                                                ].filter(v => v !== name);
                                                const current = (document.getElementById('domainMisspellings') as HTMLTextAreaElement).value;
                                                const unique = Array.from(new Set([...current.split(',').map(s => s.trim()), ...variations])).filter(Boolean).join(', ');
                                                (document.getElementById('domainMisspellings') as HTMLTextAreaElement).value = unique;
                                            }}
                                            className="flex-1 py-3 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-amber-500/20 transition-all"
                                        >
                                            Auto-Suggest Vectors
                                        </button>
                                    </div>
                                </div>
                                <p className="text-[8px] text-[#6B7280] px-2 leading-relaxed">Systematic variation vectors help search engines correctly associate misspellings with your primary authority.</p>
                            </div>

                            {/* 7. Broken URL Recovery */}
                            <div className="p-6 bg-[#FFFFFF] border border-[#ECECEC] rounded-[2rem] space-y-4">
                                <h4 className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] flex items-center gap-2">
                                    <TrendingUp size={14} className="text-[#6B7280]" /> URL Recovery Extraction
                                </h4>
                                <div className="flex items-center gap-3">
                                    <select 
                                        id="brokenUrlAction"
                                        className="flex-1 px-4 py-3 bg-[#FFFFFF] border border-[#ECECEC] rounded-xl text-[10px] font-black text-[#6B7280] uppercase tracking-widest outline-none appearance-none"
                                        defaultValue={appSettings.brokenUrlAction || 'suggest'}
                                    >
                                        <option value="home">Instant Homepage Extraction</option>
                                        <option value="suggest">Cognitive Search Suggestion</option>
                                        <option value="404">Standard 404 Protocol</option>
                                    </select>
                                    <div className="px-4 py-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                        <Clock size={14} className="text-blue-400" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: SEO & Redirects */}
                        <div className="space-y-6">
                            {/* 3. Smart Redirect Rules */}
                            <div className="p-8 bg-[#FFFFFF] border border-[#ECECEC] rounded-[3rem] space-y-6">
                                <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] flex items-center gap-2">
                                    <BarChart3 size={16} /> Redirect Architecture
                                </h4>
                                <div className="max-h-48 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
                                    {(appSettings.redirectRules || []).length === 0 && (
                                        <div className="py-8 text-center border border-dashed border-[#ECECEC] rounded-[1.5rem]">
                                            <p className="text-[9px] font-black text-[#6B7280] uppercase tracking-widest">No active routing rules</p>
                                        </div>
                                    )}
                                    {(appSettings.redirectRules || []).map((rule: any, idx: number) => (
                                        <div key={idx} className="flex items-center justify-between p-4 bg-[#ECECEC] rounded-2xl border border-[#ECECEC] group/rule">
                                            <div className="flex items-center gap-4 overflow-hidden">
                                                <div className="text-[10px] space-y-1 overflow-hidden">
                                                    <p className="text-[#6B7280] font-mono truncate">{rule.from}</p>
                                                    <div className="flex items-center gap-2">
                                                        <ArrowUpRight size={10} className="text-blue-400" />
                                                        <p className="text-blue-400 font-mono truncate">{rule.to}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[8px] font-black text-[#6B7280] bg-[#ECECEC] px-2 py-1 rounded-lg">{rule.type}</span>
                                                <button 
                                                    onClick={async () => {
                                                        const newRules = appSettings.redirectRules.filter((_: any, i: number) => i !== idx);
                                                        await adminService.updateAppSetting('redirectRules', newRules);
                                                    }}
                                                    className="w-8 h-8 rounded-xl flex items-center justify-center text-[#6B7280] hover:text-red-500 hover:bg-red-500/10 transition-all"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="space-y-4 pt-4 border-t border-[#ECECEC]">
                                    <div className="grid grid-cols-2 gap-3">
                                        <input id="redFrom" placeholder="/old-path" className="bg-[#FFFFFF] border border-[#ECECEC] px-4 py-3 rounded-xl text-[11px] text-[#111111] font-mono outline-none" />
                                        <input id="redTo" placeholder="/new-path" className="bg-[#FFFFFF] border border-[#ECECEC] px-4 py-3 rounded-xl text-[11px] text-[#111111] font-mono outline-none" />
                                    </div>
                                    <div className="flex gap-3">
                                        <select id="redType" className="bg-[#FFFFFF] border border-[#ECECEC] px-4 py-3 rounded-xl text-[10px] font-black text-[#6B7280] uppercase tracking-widest outline-none flex-1 appearance-none">
                                            <option value="301">301 Permanent</option>
                                            <option value="302">302 Temporary</option>
                                        </select>
                                        <button 
                                            onClick={async () => {
                                                const from = (document.getElementById('redFrom') as HTMLInputElement).value;
                                                const to = (document.getElementById('redTo') as HTMLInputElement).value;
                                                const type = (document.getElementById('redType') as HTMLSelectElement).value;
                                                if (from && to) {
                                                    const newRules = [...(appSettings.redirectRules || []), { from, to, type }];
                                                    await adminService.updateAppSetting('redirectRules', newRules);
                                                    (document.getElementById('redFrom') as HTMLInputElement).value = '';
                                                    (document.getElementById('redTo') as HTMLInputElement).value = '';
                                                }
                                            }}
                                            className="px-6 py-3 bg-blue-500 text-[#111111] rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20"
                                        >
                                            Add Rule
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* 4. Search Engine SEO Settings */}
                            <div className="p-8 bg-[#FFFFFF] border border-[#ECECEC] rounded-[3rem] space-y-6">
                                <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-[0.3em] flex items-center gap-2">
                                    <Search size={16} /> Global SEO Propagation
                                </h4>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-[#6B7280] uppercase tracking-widest ml-2">Meta Authority Title</label>
                                            <input id="seoTitle" defaultValue={appSettings.seoTitle || ''} className="w-full px-5 py-3 bg-[#FFFFFF] border border-[#ECECEC] rounded-xl text-xs text-[#111111]" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-[#6B7280] uppercase tracking-widest ml-2">Description Narrative</label>
                                            <textarea id="seoDesc" defaultValue={appSettings.seoDescription || ''} className="w-full px-5 py-3 bg-[#FFFFFF] border border-[#ECECEC] rounded-xl text-xs text-[#111111] h-20 resize-none" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex items-center justify-between p-4 bg-[#ECECEC] rounded-2xl border border-[#ECECEC]">
                                            <span className="text-[8px] font-black text-[#6B7280] uppercase tracking-widest leading-tight">Google Indexing</span>
                                            <button 
                                                onClick={() => adminService.updateAppSetting('allowIndexing', !appSettings.allowIndexing)}
                                                className={`w-10 h-5 rounded-full transition-all relative ${appSettings.allowIndexing ? 'bg-green-500' : 'bg-[#ECECEC]'}`}
                                            >
                                                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${appSettings.allowIndexing ? 'right-0.5' : 'left-0.5'}`} />
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between p-4 bg-[#ECECEC] rounded-2xl border border-[#ECECEC]">
                                            <span className="text-[8px] font-black text-[#6B7280] uppercase tracking-widest leading-tight">Auto Sitemap</span>
                                            <button 
                                                onClick={() => adminService.updateAppSetting('autoSitemap', !appSettings.autoSitemap)}
                                                className={`w-10 h-5 rounded-full transition-all relative ${appSettings.autoSitemap ? 'bg-blue-500' : 'bg-[#ECECEC]'}`}
                                            >
                                                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${appSettings.autoSitemap ? 'right-0.5' : 'left-0.5'}`} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-12 pt-10 border-t border-[#ECECEC] flex justify-center">
                        <button 
                            onClick={async () => {
                                const primary = (document.getElementById('primaryDomain') as HTMLInputElement).value;
                                const typos = (document.getElementById('domainMisspellings') as HTMLTextAreaElement).value;
                                const broken = (document.getElementById('brokenUrlAction') as HTMLSelectElement).value;
                                const title = (document.getElementById('seoTitle') as HTMLInputElement).value;
                                const desc = (document.getElementById('seoDesc') as HTMLTextAreaElement).value;

                                const { updateDoc, doc } = await import('firebase/firestore');
                                const { db } = await import('../firebase');
                                await updateDoc(doc(db, 'settings', 'app'), { 
                                  primaryDomain: primary || null,
                                  domainMisspellings: typos || null,
                                  brokenUrlAction: broken,
                                  seoTitle: title || null,
                                  seoDescription: desc || null,
                                  updatedAt: new Date().toISOString()
                                });
                                alert('Domain Protection Grid Authorized!');
                            }}
                            className="px-12 py-5 bg-gradient-to-r from-blue-600 to-blue-400 text-[#111111] rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] shadow-[0_20px_50px_rgba(37,99,235,0.3)] hover:scale-[1.05] transition-all active:scale-95"
                        >
                            Sync Global Protection Grid
                        </button>
                    </div>
                </div>

                <div className="bg-[#ECECEC] p-10 rounded-[3rem] border border-[#ECECEC] shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-[#E21E26]/10 rounded-full -ml-16 -mt-16 blur-2xl group-hover:bg-[#E21E26]/20 transition-all duration-700" />
                    <h3 className="font-display font-black text-xl mb-8 flex items-center gap-4 text-[#111111] uppercase tracking-widest relative z-10">
                        <MessageSquare size={24} className="text-[#E21E26]" />
                        Marketing Ecosystem
                    </h3>
                    <div className="space-y-6 text-[11px] text-[#6B7280] leading-relaxed relative z-10">
                        <div className="p-8 bg-[#FFFFFF] border border-[#E21E26]/20 rounded-[2rem] shadow-inner mb-2">
                          <p className="font-black text-[#E21E26] uppercase tracking-[0.2em] mb-4 text-xs">Propaganda Strategy (Free Tier):</p>
                          <ul className="space-y-4 font-medium">
                            <li className="flex items-start gap-3">
                                <span className="w-1.5 h-1.5 bg-[#E21E26] rounded-full mt-1.5 shadow-[0_0_8px_rgba(var(--secondary-rgb),0.5)]" />
                                <span><strong>In-App Pulse:</strong> Use "Targeted Notification" with empty UID to reach the entire population. Zero cost.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="w-1.5 h-1.5 bg-[#E21E26] rounded-full mt-1.5 shadow-[0_0_8px_rgba(var(--secondary-rgb),0.5)]" />
                                <span><strong>Push Transmission:</strong> VAPID keys are authorized. Subscribed citizens will receive alerts on all devices.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="w-1.5 h-1.5 bg-[#E21E26] rounded-full mt-1.5 shadow-[0_0_8px_rgba(var(--secondary-rgb),0.5)]" />
                                <span><strong>Broadcast Email:</strong> Use "Email All Users" to trigger a secure BCC broadcast from your terminal.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="w-1.5 h-1.5 bg-[#E21E26] rounded-full mt-1.5 shadow-[0_0_8px_rgba(var(--secondary-rgb),0.5)]" />
                                <span><strong>Global Alert:</strong> Deploy the Promo Banner below for universal visibility.</span>
                            </li>
                          </ul>
                        </div>
                    </div>
                </div>

                <div className="bg-[#ECECEC] p-10 rounded-[3rem] border border-[#ECECEC] shadow-2xl overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-primary/20 transition-all duration-700" />
                    <h3 className="font-display font-black text-xl mb-8 flex items-center gap-4 text-[#111111] uppercase tracking-widest relative z-10">
                        <Layout size={24} className="text-primary" />
                        Promotional Broadcast
                    </h3>
                    <div className="space-y-6 max-w-lg relative z-10">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] ml-2">Broadcast Script (e.g. Eid Al-Adha Collection)</label>
                          <input 
                              placeholder="Enter the message of the day..." 
                              className="w-full px-6 py-5 bg-[#FFFFFF] border border-[#ECECEC] rounded-2xl text-sm text-[#111111] outline-none focus:border-primary/40 transition-all shadow-inner font-medium"
                              id="promoText"
                              defaultValue={appSettings.promoBanner || ''}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <button 
                              onClick={async () => {
                                  const text = (document.getElementById('promoText') as HTMLInputElement).value;
                                  const { updateDoc, doc } = await import('firebase/firestore');
                                  const { db } = await import('../firebase');
                                  await updateDoc(doc(db, 'settings', 'app'), { 
                                    promoBanner: text || null,
                                    updatedAt: new Date().toISOString()
                                  });
                                  alert('Broadcast Updated!');
                              }}
                              className="py-5 bg-primary text-black rounded-2xl font-black text-[11px] uppercase tracking-[0.25em] shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95"
                          >
                              Authorize Broadcast
                          </button>
                          <button 
                              onClick={async () => {
                                  const { updateDoc, doc } = await import('firebase/firestore');
                                  const { db } = await import('../firebase');
                                  await updateDoc(doc(db, 'settings', 'app'), { 
                                    promoBanner: null,
                                    updatedAt: new Date().toISOString()
                                  });
                                  (document.getElementById('promoText') as HTMLInputElement).value = '';
                                  alert('Broadcast Silenced!');
                              }}
                              className="py-5 bg-[#ECECEC] text-[#6B7280] rounded-2xl font-black text-[11px] uppercase tracking-[0.25em] border border-[#ECECEC] hover:bg-[#ECECEC] transition-all active:scale-95"
                          >
                              Deactivate
                          </button>
                        </div>
                    </div>
                </div>

                <div className="bg-[#ECECEC] p-10 rounded-[3rem] border border-[#ECECEC] shadow-2xl relative overflow-hidden group">
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/5 rounded-full -ml-16 -mb-16 blur-2xl group-hover:bg-primary/10 transition-all duration-700" />
                    <h3 className="font-display font-black text-xl mb-8 flex items-center gap-4 text-[#111111] uppercase tracking-widest relative z-10">
                        <Bell size={24} className="text-primary" />
                        Targeted Frequency
                    </h3>
                    <div className="space-y-6 max-w-lg relative z-10">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                             <label className="text-[9px] font-black text-[#6B7280] uppercase tracking-[0.2em] ml-2">UID (Clear for All)</label>
                             <input 
                                 placeholder="Identity ID" 
                                 className="w-full px-6 py-4 bg-[#FFFFFF] border border-[#ECECEC] rounded-2xl text-[13px] text-[#111111] outline-none focus:border-primary/40 font-mono"
                                 id="targetUserId"
                             />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[9px] font-black text-[#6B7280] uppercase tracking-[0.2em] ml-2">Frequency Type</label>
                             <select 
                               id="notifType"
                               className="w-full px-6 py-4 bg-[#FFFFFF] border border-[#ECECEC] rounded-2xl text-[10px] outline-none font-black text-[#6B7280] uppercase tracking-widest cursor-pointer"
                             >
                               <option className="bg-zinc-900" value="promo">Exclusive Offer</option>
                               <option className="bg-zinc-900" value="order">Logistics Update</option>
                               <option className="bg-zinc-900" value="payment">Financial Intel</option>
                               <option className="bg-zinc-900" value="system">System Nexus</option>
                             </select>
                          </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-[#6B7280] uppercase tracking-[0.2em] ml-2">Transmission Header</label>
                            <input 
                                placeholder="Core notification title..." 
                                className="w-full px-6 py-4 bg-[#FFFFFF] border border-[#ECECEC] rounded-2xl text-sm text-[#111111] outline-none focus:border-primary/40 font-bold tracking-wide"
                                id="notifTitle"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-[#6B7280] uppercase tracking-[0.2em] ml-2">Detailed Narrative</label>
                            <textarea 
                                placeholder="Message encryption body..." 
                                className="w-full px-6 py-4 bg-[#FFFFFF] border border-[#ECECEC] rounded-2xl text-sm text-[#111111] h-32 outline-none focus:border-primary/40 resize-none font-medium leading-relaxed"
                                id="notifMessage"
                            />
                        </div>
                        <div className="pt-2">
                            <button 
                                onClick={async () => {
                                    const uid = (document.getElementById('targetUserId') as HTMLInputElement).value;
                                    const title = (document.getElementById('notifTitle') as HTMLInputElement).value;
                                    const msg = (document.getElementById('notifMessage') as HTMLInputElement).value;
                                    const type = (document.getElementById('notifType') as HTMLSelectElement).value as any;
                                    
                                    if(title && msg) {
                                        const { NotificationService } = await import('../services/notificationService');
                                        
                                        if (uid) {
                                            await NotificationService.sendNotification({
                                                userId: uid,
                                                title,
                                                message: msg,
                                                type: type
                                            });
                                            alert('Pulse Sent to Target Citizen!');
                                        } else {
                                            if (confirm('Authorize Global Broadcast to ALL citizens?')) {
                                              await NotificationService.sendNotification({
                                                  userId: 'all',
                                                  title,
                                                  message: msg,
                                                  type: type
                                              });
                                              alert(`Universal Pulse Transmitted!`);
                                            }
                                        }
                                        
                                        (document.getElementById('targetUserId') as HTMLInputElement).value = '';
                                        (document.getElementById('notifTitle') as HTMLInputElement).value = '';
                                        (document.getElementById('notifMessage') as HTMLInputElement).value = '';
                                    } else {
                                        alert('Validation Error: Header and Narrative Required');
                                    }
                                }}
                                className="w-full py-5 bg-primary text-black rounded-2xl font-black text-[11px] uppercase tracking-[0.25em] shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95"
                            >
                                Initiate Transmission
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-[#ECECEC] p-10 rounded-[3rem] border border-[#ECECEC] shadow-2xl relative group overflow-hidden">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-primary/5 rounded-full -ml-16 -mt-16 blur-2xl group-hover:bg-primary/10 transition-all duration-700" />
                    <h3 className="font-display font-black text-xl mb-8 flex items-center gap-4 text-[#111111] uppercase tracking-widest relative z-10">
                        <MessageSquare size={24} className="text-primary" />
                        Infrastructure & Support
                    </h3>
                    <div className="space-y-6 max-w-sm relative z-10">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] ml-2">Secure WhatsApp Link</label>
                          <input 
                              placeholder="+8801..." 
                              className="w-full px-6 py-4 bg-[#FFFFFF] border border-[#ECECEC] rounded-2xl text-[13px] text-[#111111] outline-none focus:border-primary/40 font-mono"
                              id="whatsappNum"
                              defaultValue={appSettings.whatsappNumber || ''}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] ml-2">Official Support Email</label>
                          <input 
                              placeholder="support@example.com" 
                              className="w-full px-6 py-4 bg-[#FFFFFF] border border-[#ECECEC] rounded-2xl text-[13px] text-[#111111] outline-none focus:border-primary/40 font-medium"
                              id="supportEmail"
                              defaultValue={appSettings.supportEmail || ''}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] ml-2">Official Hotline Number</label>
                          <input 
                              placeholder="+8801..." 
                              className="w-full px-6 py-4 bg-[#FFFFFF] border border-[#ECECEC] rounded-2xl text-[13px] text-[#111111] outline-none focus:border-primary/40 font-mono"
                              id="hotlineNumber"
                              defaultValue={appSettings.hotlineNumber || ''}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] ml-2">Headquarters Address</label>
                          <input 
                              placeholder="House 0, Road 0..." 
                              className="w-full px-6 py-4 bg-[#FFFFFF] border border-[#ECECEC] rounded-2xl text-[13px] text-[#111111] outline-none focus:border-primary/40 font-medium"
                              id="shopAddress"
                              defaultValue={appSettings.shopAddress || ''}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] ml-2">Ticker Announcement Text</label>
                          <input 
                              placeholder="Free delivery on orders over 1000tk!" 
                              className="w-full px-6 py-4 bg-[#FFFFFF] border border-[#ECECEC] rounded-2xl text-[13px] text-[#111111] outline-none focus:border-primary/40 font-medium italic"
                              id="announcementBar"
                              defaultValue={appSettings.announcementBar || ''}
                          />
                        </div>
                        <button 
                            onClick={async () => {
                                const whatsapp = (document.getElementById('whatsappNum') as HTMLInputElement).value;
                                const email = (document.getElementById('supportEmail') as HTMLInputElement).value;
                                const hotline = (document.getElementById('hotlineNumber') as HTMLInputElement).value;
                                const address = (document.getElementById('shopAddress') as HTMLInputElement).value;
                                const promo = (document.getElementById('announcementBar') as HTMLInputElement).value;
                                const bkash = (document.getElementById('bkashNum') as HTMLInputElement).value;
                                const nagad = (document.getElementById('nagadNum') as HTMLInputElement).value;
                                const rocket = (document.getElementById('rocketNum') as HTMLInputElement).value;

                                const { updateDoc, doc } = await import('firebase/firestore');
                                const { db } = await import('../firebase');
                                await updateDoc(doc(db, 'settings', 'app'), { 
                                  whatsappNumber: whatsapp || null,
                                  supportEmail: email || null,
                                  hotlineNumber: hotline || null,
                                  shopAddress: address || null,
                                  announcementBar: promo || null,
                                  bkashNumber: bkash || '01700-000000',
                                  nagadNumber: nagad || '01700-000000',
                                  rocketNumber: rocket || '01700-000000',
                                  updatedAt: new Date().toISOString()
                                });
                                alert('Infrastructure Manifest Updated!');
                            }}
                            className="w-full py-5 bg-primary text-black rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 mt-4"
                        >
                            Authorize Site Configuration
                        </button>
                    </div>
                </div>

                <div className="bg-[#ECECEC] p-10 rounded-[3rem] border border-[#ECECEC] shadow-2xl relative group overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#E21E26]/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-[#E21E26]/10 transition-all duration-700" />
                    <h3 className="font-display font-black text-xl mb-8 flex items-center gap-4 text-[#111111] uppercase tracking-widest relative z-10">
                        <CreditCard size={24} className="text-[#E21E26]" />
                        Merchant Financial Grid
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] ml-2">bKash Personal</label>
                          <input 
                              placeholder="017..." 
                              className="w-full px-6 py-4 bg-[#FFFFFF] border border-[#ECECEC] rounded-2xl text-[13px] text-[#111111] outline-none focus:border-[#E21E26]/40 font-mono"
                              id="bkashNum"
                              defaultValue={appSettings.bkashNumber || '01700-000000'}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] ml-2">Nagad Personal</label>
                          <input 
                              placeholder="017..." 
                              className="w-full px-6 py-4 bg-[#FFFFFF] border border-[#ECECEC] rounded-2xl text-[13px] text-[#111111] outline-none focus:border-[#E21E26]/40 font-mono"
                              id="nagadNum"
                              defaultValue={appSettings.nagadNumber || '01700-000000'}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] ml-2">Rocket Personal</label>
                          <input 
                              placeholder="017..." 
                              className="w-full px-6 py-4 bg-[#FFFFFF] border border-[#ECECEC] rounded-2xl text-[13px] text-[#111111] outline-none focus:border-[#E21E26]/40 font-mono"
                              id="rocketNum"
                              defaultValue={appSettings.rocketNumber || '01700-000000'}
                          />
                        </div>
                    </div>
                </div>

                <div className="bg-[#ECECEC] p-10 rounded-[3rem] border border-[#ECECEC] shadow-2xl relative group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-primary/10 transition-all duration-700" />
                    <h3 className="font-display font-black text-xl mb-8 flex items-center gap-4 text-[#111111] uppercase tracking-widest relative z-10">
                        <ImageIcon size={24} className="text-primary" />
                        Aesthetic & Identity
                    </h3>
                    <div className="space-y-10 relative z-10">
                        <div className="max-w-md space-y-3">
                          <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] ml-2">Venture Designation (App Name)</label>
                          <input 
                              placeholder="e.g. সদাই ভাই" 
                              className="w-full px-6 py-4 bg-[#FFFFFF] border border-[#ECECEC] rounded-2xl text-[14px] text-[#111111] font-bold outline-none focus:border-primary/40 tracking-wide"
                              id="appNameInput"
                              defaultValue={appSettings.appName || ''}
                              onBlur={async (e) => {
                                await adminService.updateAppSetting('appName', e.target.value);
                              }}
                          />
                        </div>
                        
                        <div className="max-w-md">
                            <ImageUpload 
                                label="Primary Identity Asset (Logo)"
                                currentImage={appSettings.logo}
                                onUpload={updateLogo}
                            />
                            <p className="text-[9px] text-[#6B7280] mt-4 leading-relaxed font-black uppercase tracking-[0.2em] italic">
                                Appears on navbar, secure communications, and app icon.
                            </p>
                        </div>

                        <div className="border-t border-[#ECECEC] pt-10">
                          <h4 className="font-display font-bold text-xs uppercase tracking-[0.3em] text-[#6B7280] mb-6 font-mono">PWA Deployment Visuals</h4>
                          <div className="grid grid-cols-2 gap-8">
                            <ImageUpload 
                                label="Mobile Frame (9:16)"
                                currentImage={appSettings.screenshotMobile}
                                onUpload={(base64) => adminService.updateAppSetting('screenshotMobile', base64)}
                            />
                            <ImageUpload 
                                label="Workstation Frame (16:9)"
                                currentImage={appSettings.screenshotDesktop}
                                onUpload={(base64) => adminService.updateAppSetting('screenshotDesktop', base64)}
                            />
                          </div>
                          <p className="text-[9px] text-[#6B7280] mt-6 leading-relaxed font-black uppercase tracking-[0.2em] italic">
                              Interface previews presented during verified application installation sequences.
                          </p>
                        </div>

                        <div className="border-t border-[#ECECEC] pt-10">
                          <h4 className="font-display font-bold text-xs uppercase tracking-[0.3em] text-[#6B7280] mb-6 font-mono">Push Frequency Diagnostics</h4>
                          <div className="p-8 bg-[#FFFFFF] rounded-[2rem] border border-[#ECECEC] shadow-inner">
                            <p className="text-[9px] text-[#6B7280] font-black uppercase tracking-[0.3em] mb-4">Neural Backend Connectivity</p>
                            
                            <div className="mb-6 space-y-3">
                                <button 
                                  onClick={async () => {
                                    try {
                                      const res = await fetch('/api/fcm-status');
                                      const text = await res.text();
                                      try {
                                        const data = JSON.parse(text);
                                        const statusLines = [
                                          `Firebase Admin: ${data.adminInitialized ? "✅ READY" : "❌ OFF"}`,
                                          `Web Push VAPID: ${data.vapidSet ? "✅ SET" : "❌ MISSING"}`,
                                          `Telegram Bot: ${data.telegram?.hasToken ? "✅ SET" : "❌ MISSING"}`,
                                          `Telegram Chat: ${data.telegram?.hasChatId ? "✅ SET" : "❌ MISSING"}`,
                                          `--- Environment Audit ---`,
                                          `Admin JSON: ${data.env.hasServiceAccount ? "Found" : "Missing"}`,
                                          `VAPID Public: ${data.env.hasVapidPublic ? "Found" : "Missing"}`,
                                          `VAPID Private: ${data.env.hasVapidPrivate ? "Found" : "Missing"}`,
                                          `Platform: ${data.vercel ? "Vercel" : "Local"}`
                                        ];
                                        alert("Neural Network Status:\n\n" + statusLines.join("\n"));
                                      } catch (je) {
                                        alert("Server returned raw text:\n" + text.substring(0, 500));
                                      }
                                    } catch (e: any) {
                                      alert("Connectivity Error: " + e.message);
                                    }
                                  }}
                                  className="w-full py-3 bg-[#ECECEC] text-[#6B7280] border border-[#ECECEC] rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-[#ECECEC] transition-all"
                                >
                                  Ping Backend Infrastructure
                                </button>
                                <button 
                                  onClick={async () => {
                                    try {
                                      const res = await fetch('/api/test-telegram');
                                      const data = await res.json();
                                      if (data.success) {
                                        alert("Success! Check your Telegram bot for the test message.");
                                      } else {
                                        alert("Telegram Failed:\n" + (data.error || JSON.stringify(data)));
                                      }
                                    } catch (e: any) {
                                      alert("Connectivity Error: " + e.message);
                                    }
                                  }}
                                  className="w-full py-3 bg-[#ECECEC] text-[#6B7280] border border-[#ECECEC] rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-[#ECECEC] transition-all mb-3"
                                >
                                  Test Telegram Signal
                                </button>
                                <button 
                                  onClick={async () => {
                                    try {
                                      const { MessagingService } = await import('../services/messagingService');
                                      const token = await MessagingService.requestPermissionAndGetToken();
                                      alert(token ? "Token secured: " + token.substring(0, 20) + "..." : "Failed to get token (Check console/permissions)");
                                    } catch (e: any) {
                                      alert("Token Error: " + e.message);
                                    }
                                  }}
                                  className="w-full py-3 bg-[#ECECEC] text-[#6B7280] border border-[#ECECEC] rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-[#ECECEC] transition-all"
                                >
                                  Check Client Permissions
                                </button>
                            </div>

                            <button 
                              onClick={async () => {
                                try {
                                  const { MessagingService } = await import('../services/messagingService');
                                  const res = await MessagingService.testPush();
                                  if (res.success) {
                                    alert("Success! Transmission received on target device.");
                                  } else {
                                    const errorMsg = typeof res.error === 'string' ? res.error : JSON.stringify(res.error);
                                    alert("Error: " + (errorMsg || "Unknown Neural Failure") + "\nTip: Ensure Vercel Environment Variables are set.");
                                  }
                                } catch (e: any) {
                                  alert("Error: " + e.message);
                                }
                              }}
                              className="w-full py-5 bg-[#ECECEC] text-[#6B7280] border border-[#ECECEC] rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] shadow-lg hover:bg-[#ECECEC] hover:text-[#111111] transition-all active:scale-[0.98]"
                            >
                              Dispatch Signal
                            </button>
                            <p className="text-[8px] text-[#6B7280] mt-4 italic font-medium tracking-wider">
                                * Node.js core push requires VAPID_PRIVATE_KEY and FIREBASE_SERVICE_ACCOUNT_JSON secure vault secrets.
                            </p>
                          </div>
                        </div>
                    </div>
                </div>

                <div className="bg-[#ECECEC] p-10 rounded-[3rem] border border-[#ECECEC] shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-primary/5 rounded-full -ml-16 -mt-16 blur-2xl group-hover:bg-primary/10 transition-all duration-700" />
                    <h3 className="font-display font-black text-xl mb-8 flex items-center gap-4 text-[#111111] uppercase tracking-widest relative z-10">
                        <Layout size={24} className="text-primary" />
                        Feature Action Buttons
                    </h3>
                    <div className="space-y-6 relative z-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            { (appSettings.featureButtons || []).map((btn: any, idx: number) => (
                                <div key={idx} className="p-6 bg-[#FFFFFF] border border-[#ECECEC] rounded-2xl flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 bg-gradient-to-br ${btn.color} rounded-xl flex items-center justify-center text-[#111111] shadow-lg`}>
                                            <TrendingUp size={18} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-[13px] text-[#111111]">{btn.title}</p>
                                            <p className="text-[9px] text-[#6B7280] uppercase font-mono tracking-tighter">{btn.path}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={async () => {
                                            const newButtons = appSettings.featureButtons.filter((_: any, i: number) => i !== idx);
                                            await adminService.updateAppSetting('featureButtons', newButtons);
                                        }}
                                        className="text-red-500/40 hover:text-red-500 hover:bg-red-500/10 p-3 rounded-xl transition-all"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="p-8 bg-[#FFFFFF] rounded-[2.5rem] border border-[#ECECEC] space-y-5">
                            <p className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] font-mono">Deploy New Vector</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-[9px] font-black text-[#6B7280] uppercase tracking-widest ml-1">Title</label>
                                  <input id="fTitle" placeholder="Button Title" className="w-full bg-[#FFFFFF] border border-[#ECECEC] p-4 rounded-xl text-xs outline-none focus:border-primary/40 text-[#111111]" />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[9px] font-black text-[#6B7280] uppercase tracking-widest ml-1">Path</label>
                                  <input id="fPath" placeholder="/products?brand=... " className="w-full bg-[#FFFFFF] border border-[#ECECEC] p-4 rounded-xl text-xs outline-none focus:border-primary/40 text-[#111111]" />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[9px] font-black text-[#6B7280] uppercase tracking-widest ml-1">Gradient Class</label>
                                  <input id="fColor" placeholder="from-blue-400 to-indigo-500" className="w-full bg-[#FFFFFF] border border-[#ECECEC] p-4 rounded-xl text-xs outline-none focus:border-primary/40 text-[#111111]" />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[9px] font-black text-[#6B7280] uppercase tracking-widest ml-1">Visual Symbol</label>
                                  <select id="fIcon" className="w-full bg-[#FFFFFF] border border-[#ECECEC] p-4 rounded-xl text-xs outline-none text-[#6B7280] appearance-none">
                                      <option value="zap">Zap (Bolt)</option>
                                      <option value="gift">Gift</option>
                                      <option value="award">Award (Star)</option>
                                      <option value="shopping-cart">Cart</option>
                                      <option value="tag">Tag</option>
                                  </select>
                                </div>
                            </div>
                            <button 
                                onClick={async () => {
                                    const title = (document.getElementById('fTitle') as HTMLInputElement).value;
                                    const path = (document.getElementById('fPath') as HTMLInputElement).value;
                                    const color = (document.getElementById('fColor') as HTMLInputElement).value;
                                    const icon = (document.getElementById('fIcon') as HTMLSelectElement).value;

                                    if (!title || !path) return alert('Title and Path required');

                                    const newButtons = [...(appSettings.featureButtons || []), { title, path, color: color || 'from-gray-700 to-gray-900', icon }];
                                    await adminService.updateAppSetting('featureButtons', newButtons);
                                    
                                    (document.getElementById('fTitle') as HTMLInputElement).value = '';
                                    (document.getElementById('fPath') as HTMLInputElement).value = '';
                                    (document.getElementById('fColor') as HTMLInputElement).value = '';
                                }}
                                className="w-full py-5 bg-primary text-black rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95"
                            >
                                Integrate Vector
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-[#ECECEC] p-10 rounded-[3rem] border border-[#ECECEC] shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-primary/5 rounded-full -ml-16 -mt-16 blur-2xl group-hover:bg-primary/10 transition-all duration-700" />
                    <h3 className="font-display font-black text-xl mb-8 flex items-center gap-4 text-[#111111] uppercase tracking-widest relative z-10">
                        <Truck size={24} className="text-primary" />
                        Logistics Jurisdiction
                    </h3>
                    
                    <div className="space-y-4 mb-10 relative z-10">
                        {deliveryAreas.map(area => (
                            <div key={area.id} className="flex items-center justify-between p-8 bg-[#FFFFFF] rounded-[2rem] border border-[#ECECEC] group/area hover:border-primary/20 transition-all">
                                <div className="flex gap-10">
                                    <div className="space-y-1">
                                        <h4 className="text-[8px] font-black text-[#6B7280] uppercase tracking-[0.3em]">Sector Name</h4>
                                        <p className="font-bold text-sm text-[#111111] group-hover/area:text-primary transition-colors tracking-wide">{area.name}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[8px] font-black text-[#6B7280] uppercase tracking-[0.3em]">Unit Tariff</p>
                                        <p className="text-sm font-black text-primary font-mono">৳{formatCurrency(area.fee)}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => adminService.deleteDeliveryArea(area.id)}
                                    className="w-12 h-12 bg-[#ECECEC] rounded-2xl flex items-center justify-center text-[#6B7280] hover:text-red-500 hover:bg-red-500/10 transition-all"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="bg-[#FFFFFF] p-10 rounded-[2.5rem] border border-[#ECECEC] shadow-inner relative z-10">
                        <p className="text-[9px] font-black text-[#6B7280] uppercase tracking-[0.4em] mb-8 text-center">Incorporate New logistics sector</p>
                        <div className="flex flex-wrap gap-4 mb-8 justify-center">
                            <button 
                                onClick={() => setNewArea({ name: 'গাইবান্ধা পৌরসভা (ভিতর)', fee: 40 })}
                                className="text-[9px] font-black uppercase px-5 py-3 bg-[#ECECEC] border border-[#ECECEC] rounded-xl text-primary hover:bg-[#ECECEC] transition-all"
                            >
                                + Municipal Internal (40৳)
                            </button>
                            <button 
                                onClick={() => setNewArea({ name: 'গাইবান্ধা পৌরসভা (বাহির)', fee: 60 })}
                                className="text-[9px] font-black uppercase px-5 py-3 bg-[#ECECEC] border border-[#ECECEC] rounded-xl text-primary hover:bg-[#ECECEC] transition-all"
                            >
                                + Municipal External (60৳)
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-[#6B7280] uppercase tracking-widest ml-1">Sector Designation</label>
                                <input 
                                    placeholder="Sector Name (e.g. Uttara)" 
                                    className="w-full px-6 py-4 bg-[#FFFFFF] border border-[#ECECEC] rounded-2xl text-[13px] text-[#111111] outline-none focus:border-primary/40 font-medium"
                                    value={newArea.name}
                                    onChange={e => setNewArea({...newArea, name: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-[#6B7280] uppercase tracking-widest ml-1">Tariff rate</label>
                                <input 
                                    placeholder="Fee" 
                                    type="number"
                                    className="w-full px-6 py-4 bg-[#FFFFFF] border border-[#ECECEC] rounded-2xl text-[13px] text-primary outline-none focus:border-primary/40 font-mono font-bold"
                                    value={isNaN(newArea.fee) ? '' : newArea.fee}
                                    onChange={e => {
                                        const val = parseInt(e.target.value);
                                        setNewArea({...newArea, fee: isNaN(val) ? 0 : val});
                                    }}
                                />
                            </div>
                        </div>
                        <button 
                            onClick={async () => {
                                await adminService.updateDeliveryArea('new', newArea);
                                setNewArea({ name: '', fee: 50 });
                            }}
                            className="w-full py-5 bg-primary text-black rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all"
                        >
                            Authorize Area Protocol
                        </button>
                    </div>
                </div>

                <div className="bg-[#ECECEC] p-10 rounded-[3rem] border border-[#ECECEC] shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#E21E26]/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-[#E21E26]/10 transition-all duration-700" />
                    <h3 className="font-display font-black text-xl mb-6 flex items-center gap-4 text-[#111111] uppercase tracking-widest relative z-10">
                        <CreditCard size={24} className="text-[#E21E26]" />
                        Infrastructure Parameters
                    </h3>
                    <p className="text-[10px] text-[#6B7280] mb-10 font-bold uppercase tracking-[0.2em] relative z-10">Critical global overrides for system maintenance and promo synchronization.</p>
                    <div className="grid grid-cols-2 gap-6 relative z-10">
                        <button className="py-6 bg-[#FFFFFF] border border-[#ECECEC] rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] text-[#6B7280] hover:bg-[#ECECEC] hover:text-[#111111] hover:border-[#ECECEC] transition-all active:scale-95 shadow-lg">Maintenance Sequence</button>
                        <button className="py-6 bg-[#FFFFFF] border border-[#ECECEC] rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] text-[#6B7280] hover:bg-[#ECECEC] hover:text-[#111111] hover:border-[#ECECEC] transition-all active:scale-95 shadow-lg">Neural Sale Toggle</button>
                    </div>
                </div>
            </motion.div>
        )}
        {activeTab === 'riders' && (
          <motion.div key="riders-tracking" className="space-y-10">
            <h3 className="font-display font-black text-2xl px-2 flex items-center gap-4 text-[#111111] uppercase tracking-[0.2em]">
                <Truck size={32} className="text-primary" />
                Live Fleet Tracking ({sellers.filter(s => s.role === 'rider').length})
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {sellers.filter(s => s.role === 'rider').map(rider => {
                    const activeDeliveries = orders.filter(o => o.riderId === rider.id && o.status !== 'delivered' && o.status !== 'cancelled');
                    return (
                        <div key={rider.id} className="bg-[#ECECEC] p-8 rounded-[3rem] border border-[#ECECEC] shadow-2xl space-y-6 group hover:border-primary/20 transition-all relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-primary/10 transition-all" />
                            <div className="flex justify-between items-start relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-[#FFFFFF] text-[#111111] rounded-[1.5rem] flex items-center justify-center relative shadow-2xl border border-[#ECECEC]">
                                        <User size={32} className="text-[#6B7280]" />
                                        <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-[#0a0a0a] shadow-lg ${rider.status === 'online' ? 'bg-green-500' : 'bg-[#ECECEC]'}`} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg text-[#111111] group-hover:text-primary transition-colors">{rider.displayName || 'Anonymous Operative'}</h4>
                                        <p className="text-[10px] text-[#6B7280] font-black uppercase tracking-[0.2em]">{rider.phone || 'No Contact Data'}</p>
                                    </div>
                                </div>
                                <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-xl border ${rider.status === 'online' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-[#ECECEC] text-[#6B7280] border-[#ECECEC]'}`}>
                                    {rider.status || 'Offline'}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 relative z-10">
                                <div className="bg-[#FFFFFF] p-4 rounded-2xl border border-[#ECECEC]">
                                    <span className="text-[9px] font-black text-[#6B7280] uppercase tracking-[0.2em] block mb-2">Active Sorties</span>
                                    <p className="font-display font-black text-[#111111] text-xl">{activeDeliveries.length}</p>
                                </div>
                                <div className="bg-[#FFFFFF] p-4 rounded-2xl border border-[#ECECEC]">
                                    <span className="text-[9px] font-black text-[#6B7280] uppercase tracking-[0.2em] block mb-2">Signal Echo</span>
                                    <p className="text-[10px] font-bold text-primary uppercase">
                                        {rider.lastLocationUpdate ? format(rider.lastLocationUpdate.toDate ? rider.lastLocationUpdate.toDate() : new Date(rider.lastLocationUpdate), 'h:mm a') : 'No Link'}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3 relative z-10">
                                <span className="text-[9px] font-black text-[#6B7280] uppercase tracking-[0.2em] block">Active Mission Manifest</span>
                                {activeDeliveries.length > 0 ? (
                                    <div className="space-y-2">
                                        {activeDeliveries.map(order => (
                                            <div key={order.id} className="p-4 bg-[#FFFFFF] border border-[#ECECEC] rounded-2xl flex items-center justify-between group/manifest hover:border-primary/30 transition-all">
                                                <div>
                                                    <p className="text-[11px] font-bold text-[#111111] tracking-tight">Order #{order.id.slice(-6).toUpperCase()}</p>
                                                    <p className="text-[9px] text-[#6B7280] uppercase font-mono">{order.customerName}</p>
                                                </div>
                                                <span className="text-[8px] font-black uppercase text-primary bg-primary/5 px-2 py-1 rounded-lg border border-primary/20">
                                                    {order.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-4 text-center border border-dashed border-[#ECECEC] rounded-2xl">
                                        <p className="text-[9px] font-black text-[#6B7280] uppercase tracking-widest">No active sorties</p>
                                    </div>
                                )}
                            </div>

                            {rider.location && (
                                <a 
                                    href={`https://www.google.com/maps?q=${rider.location.lat},${rider.location.lng}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-full py-4 bg-[#ECECEC] text-[#6B7280] border border-[#ECECEC] rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-[#ECECEC] hover:text-[#111111] transition-all active:scale-[0.98] relative z-10"
                                >
                                    <MapPin size={16} className="text-primary" /> Intercept Position
                                </a>
                            )}
                        </div>
                    );
                })}
            </div>
            {sellers.filter(s => s.role === 'rider').length === 0 && (
                <div className="text-center py-32 bg-[#ECECEC] rounded-[4rem] border border-dashed border-[#ECECEC]">
                    <Truck size={64} className="mx-auto text-[#6B7280] mb-6" />
                    <p className="text-[11px] font-black text-[#6B7280] uppercase tracking-[0.4em]">Fleet currently decommissioned</p>
                </div>
            )}
          </motion.div>
        )}

        {activeTab === 'neural_push' && (
          <motion.div key="neural_push" className="space-y-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h2 className="text-4xl font-black text-[#111111] tracking-tighter uppercase italic">Neural Push Broadcast</h2>
                        <p className="text-[#6B7280] text-[11px] font-bold mt-2 uppercase tracking-widest">Transmit real-time alerts to all connected nodes</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="bg-[#ECECEC] rounded-[3rem] border border-[#ECECEC] p-10 space-y-10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                                <MessageSquare size={24} />
                            </div>
                            <h3 className="text-xl font-bold">Compose Transmission</h3>
                        </div>
                        
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] ml-2">Neural Header</label>
                                <input 
                                    id="pushTitle"
                                    className="w-full px-8 py-5 bg-[#FFFFFF] border border-[#ECECEC] rounded-3xl text-sm text-[#111111] outline-none focus:border-[#D50000]/40 font-bold transition-all shadow-inner" 
                                    placeholder="Enter Alert Title..."
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] ml-2">Visual Heritage (Optional Image URL)</label>
                                <input 
                                    id="pushImage"
                                    className="w-full px-8 py-5 bg-[#FFFFFF] border border-[#ECECEC] rounded-3xl text-sm text-[#111111] outline-none focus:border-[#D50000]/40 font-bold transition-all shadow-inner" 
                                    placeholder="https://example.com/banner.jpg"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] ml-2">Transmission Load (Body)</label>
                                <textarea 
                                    id="pushBody"
                                    className="w-full px-8 py-6 bg-[#FFFFFF] border border-[#ECECEC] rounded-[2.5rem] text-sm text-[#111111] outline-none focus:border-[#D50000]/40 font-bold transition-all shadow-inner min-h-[160px] resize-none" 
                                    placeholder="Manifest your message to all nodes..."
                                />
                            </div>
                            <button 
                                onClick={async () => {
                                    const title = (document.getElementById('pushTitle') as HTMLInputElement).value;
                                    const image = (document.getElementById('pushImage') as HTMLInputElement).value;
                                    const body = (document.getElementById('pushBody') as HTMLTextAreaElement).value;
                                    if (!title || !body) return alert('Title and Body required');
                                    
                                    if (confirm('Initiate global push broadcast?')) {
                                        try {
                                            const res = await fetch('/api/admin/bulk-push', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ title, body, image })
                                            });
                                            const data = await res.json();
                                            if (res.ok) {
                                                alert(`Broadcast initiated! Targets reached: ${data.count}. Sent successfully: ${data.sentCount}`);
                                                (document.getElementById('pushTitle') as HTMLInputElement).value = '';
                                                (document.getElementById('pushImage') as HTMLInputElement).value = '';
                                                (document.getElementById('pushBody') as HTMLTextAreaElement).value = '';
                                            } else {
                                              throw new Error(data.error || 'Broadcast failed');
                                            }
                                        } catch (e: any) {
                                            alert('Signal interruption: ' + e.message);
                                        }
                                    }
                                }}
                                className="w-full py-6 bg-[#D50000] text-black rounded-3xl font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl shadow-[#D50000]/20 active:scale-95 transition-all"
                            >
                                Transmit Neural Signal
                            </button>
                        </div>
                    </div>

                    <div className="bg-[#ECECEC] rounded-[3rem] border border-[#ECECEC] p-10 space-y-10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-[#ECECEC] rounded-2xl flex items-center justify-center text-[#6B7280]">
                                <BarChart3 size={24} />
                            </div>
                            <h3 className="text-xl font-bold">PWA Analytics</h3>
                        </div>

                        <div className="space-y-6">
                            <div className="p-8 bg-[#FFFFFF] rounded-[2.5rem] border border-[#ECECEC] flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.2em]">Active Push Channels</p>
                                    <p className="text-2xl font-black text-[#111111] mt-1 tabular-nums">{sellers.filter(u => u.pushEnabled).length}</p>
                                </div>
                                <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500">
                                    <Zap size={20} />
                                </div>
                            </div>
                            <div className="p-8 bg-[#FFFFFF] rounded-[2.5rem] border border-[#ECECEC] flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.2em]">PWA Installed Base</p>
                                    <p className="text-2xl font-black text-[#111111] mt-1 tabular-nums italic">~{sellers.length} Nodes</p>
                                </div>
                                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                                    <ShoppingBag size={20} />
                                </div>
                            </div>
                            <div className="p-10 bg-[#FFFFFF] rounded-[2.5rem] border border-[#ECECEC] relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 text-[#6B7280] group-hover:text-[#6B7280] transition-colors">
                                    <ShieldCheck size={100} />
                                </div>
                                <div className="relative z-10 space-y-4">
                                     <h4 className="text-xs font-black uppercase tracking-widest text-primary italic">Neural Compliance</h4>
                                     <p className="text-[11px] text-[#6B7280] leading-relaxed font-bold">Standard PWA manifests are forced into standalone protocol. All mobile nodes registered via Android App Drawer are being tracked for notification synchronization.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
          </motion.div>
        )}
        {activeTab === 'email_marketing' && (
          <motion.div key="email_marketing" className="space-y-10">
            <div className="flex items-center justify-between">
                <h3 className="font-display font-black text-2xl px-2 flex items-center gap-4 text-[#111111] uppercase tracking-[0.2em]">
                    <MessageSquare size={32} className="text-[#D50000]" />
                    Email Marketing Console
                </h3>
                <div className="flex gap-4">
                  <div className="bg-[#ECECEC] border border-[#ECECEC] px-6 py-3 rounded-2xl flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-black text-[#6B7280] uppercase tracking-widest">Active nodes: {sellers.filter(u => u.email).length}</span>
                    </div>
                  </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Email Composition */}
                <div className="bg-[#ECECEC] p-10 rounded-[3rem] border border-[#ECECEC] shadow-2xl space-y-8 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#D50000] to-transparent opacity-40" />
                    <h4 className="text-sm font-black text-[#111111] uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                        <Plus size={20} className="text-[#D50000]" /> Draft Marketing Campaign
                    </h4>
                    
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] ml-2">Recipient Strategy (All sent via BCC)</label>
                            <select 
                                id="emailTarget"
                                className="w-full px-8 py-5 bg-[#FFFFFF] border border-[#ECECEC] rounded-3xl text-sm text-[#111111] outline-none focus:border-[#D50000]/40 font-bold transition-all shadow-inner appearance-none"
                                onChange={(e) => {
                                    const customField = document.getElementById('customEmailsField');
                                    if (customField) {
                                        customField.style.display = e.target.value === 'custom' ? 'block' : 'none';
                                    }
                                }}
                            >
                                <option value="all">All Registered Users ({sellers.filter(u => u.email).length})</option>
                                <option value="no-push">Users without Push Notifications ({sellers.filter(u => u.email && !u.pushEnabled).length})</option>
                                <option value="custom">Custom Email List (Manual BCC)</option>
                            </select>
                        </div>

                        <div id="customEmailsField" className="space-y-3 hidden">
                            <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] ml-2">Manual Email Addresses (Comma separated)</label>
                            <textarea 
                                id="customEmails"
                                placeholder="email1@example.com, email2@example.com..." 
                                className="w-full px-8 py-5 bg-[#FFFFFF] border border-[#ECECEC] rounded-3xl text-sm text-[#111111] outline-none focus:border-[#D50000]/40 font-bold transition-all shadow-inner h-24"
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] ml-2">Campaign Subject</label>
                            <input 
                                id="emailSubject"
                                placeholder="Summer Flash Sale 2024..." 
                                className="w-full px-8 py-5 bg-[#FFFFFF] border border-[#ECECEC] rounded-3xl text-sm text-[#111111] outline-none focus:border-[#D50000]/40 font-bold transition-all shadow-inner"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] ml-2">Marketing Content (HTML Allowed)</label>
                            <textarea 
                                id="emailBody"
                                placeholder="<h1>Fresh Arrival!</h1><p>Our premium mangoes are back in stock...</p>" 
                                className="w-full px-8 py-6 bg-[#FFFFFF] border border-[#ECECEC] rounded-[2.5rem] text-sm text-[#6B7280] outline-none focus:border-[#D50000]/40 h-64 resize-none leading-relaxed"
                            />
                        </div>

                        <div className="p-4 bg-[#ECECEC] rounded-2xl border border-[#ECECEC] flex items-start gap-4">
                            <div className="w-8 h-8 bg-[#D50000]/10 rounded-lg flex items-center justify-center text-[#D50000] shrink-0">
                                <ShieldCheck size={16} />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-[#D50000] uppercase tracking-widest">Privacy Protocol Active</p>
                                <p className="text-[9px] text-[#6B7280] leading-relaxed">সকল মেইল BCC (Blind Carbon Copy) হিসেবে পাঠানো হবে। এতে কাস্টমাররা একে অপরের ইমেইল দেখতে পারবে না।</p>
                            </div>
                        </div>

                        <button 
                            onClick={async () => {
                                const target = (document.getElementById('emailTarget') as HTMLSelectElement).value;
                                const customEmails = (document.getElementById('customEmails') as HTMLTextAreaElement)?.value;
                                const subject = (document.getElementById('emailSubject') as HTMLInputElement).value;
                                const body = (document.getElementById('emailBody') as HTMLTextAreaElement).value;
                                if (!subject || !body) return alert('Subject and Body required for campaign');
                                if (target === 'custom' && !customEmails) return alert('Please enter at least one recipient email');
                                
                                if (confirm(`Authorize this marketing dispatch to selected nodes?`)) {
                                    let bccList: string[] = [];
                                    if (target === 'all') {
                                        bccList = sellers.filter(u => u.email).map(u => u.email as string);
                                    } else if (target === 'no-push') {
                                        bccList = sellers.filter(u => u.email && !u.pushEnabled).map(u => u.email as string);
                                    } else if (target === 'custom') {
                                        bccList = customEmails.split(',').map(e => e.trim()).filter(e => e);
                                    }
                                    
                                    if (bccList.length === 0) {
                                        alert('No valid emails found for the selected target.');
                                        return;
                                    }

                                    const bcc = bccList.join(',');
                                    const mailtoUrl = `mailto:?bcc=${bcc}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                                    window.open(mailtoUrl, '_blank');
                                    
                                    (document.getElementById('emailSubject') as HTMLInputElement).value = '';
                                    (document.getElementById('emailBody') as HTMLTextAreaElement).value = '';
                                    if (target === 'custom') (document.getElementById('customEmails') as HTMLTextAreaElement).value = '';
                                }
                            }}
                            className="w-full py-6 bg-[#D50000] text-black rounded-[2.5rem] font-black text-xs uppercase tracking-[0.4em] shadow-2xl shadow-[#D50000]/30 hover:scale-[1.02] transition-all active:scale-95"
                        >
                            Execute Global Dispatch
                        </button>
                    </div>
                </div>

                {/* User Tracking & Analytics */}
                <div className="space-y-8">
                    <div className="bg-[#ECECEC] p-10 rounded-[3rem] border border-[#ECECEC] shadow-2xl">
                        <h4 className="text-sm font-black text-[#111111] uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
                            <BarChart3 size={20} className="text-[#E21E26]" /> Subscription Analytics
                        </h4>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="p-6 bg-[#FFFFFF] rounded-3xl border border-[#ECECEC]">
                                <p className="text-[9px] font-black text-[#6B7280] uppercase tracking-[0.2em] mb-2">Push Enabled</p>
                                <p className="text-2xl font-black text-[#111111]">{sellers.filter(u => u.fcmToken).length} <span className="text-[10px] text-green-500 ml-1">Nodes</span></p>
                            </div>
                            <div className="p-6 bg-[#FFFFFF] rounded-3xl border border-[#ECECEC]">
                                <p className="text-[9px] font-black text-[#6B7280] uppercase tracking-[0.2em] mb-2">Email Reach</p>
                                <p className="text-2xl font-black text-[#111111]">{sellers.filter(u => u.email).length} <span className="text-[10px] text-[#E21E26] ml-1">Nodes</span></p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#ECECEC] p-10 rounded-[3rem] border border-[#ECECEC] shadow-2xl overflow-hidden">
                        <h4 className="text-sm font-black text-[#111111] uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
                            <Users size={20} className="text-[#E21E26]" /> Recent Subscriptions
                        </h4>
                        <div className="space-y-4 max-h-[400px] overflow-y-auto scrollbar-hide pr-2">
                            {sellers.slice(0, 20).map(u => (
                                <div key={u.id} className="p-4 bg-[#FFFFFF] rounded-2xl border border-[#ECECEC] flex items-center justify-between group hover:border-[#E21E26]/30 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-[#ECECEC] flex items-center justify-center text-[#6B7280]">
                                            <User size={20} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-[#111111] group-hover:text-[#E21E26] transition-colors">{u.displayName || 'Anonymous Node'}</p>
                                            <p className="text-[10px] text-[#6B7280] font-mono italic">{u.email || 'No Email'}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {u.fcmToken ? (
                                            <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500" title="Push Authorized">
                                                <Bell size={14} />
                                            </div>
                                        ) : (
                                            <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500/40" title="Push Blocked">
                                                <Bell size={14} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
          </motion.div>
        )}
        {activeTab === 'financials' && (
          <motion.div key="financials" className="space-y-10">
            <h3 className="font-display font-black text-2xl px-2 flex items-center gap-4 text-[#111111] uppercase tracking-[0.2em]">
                <CreditCard size={32} className="text-[#E21E26]" />
                Treasury & Settlements
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-[#ECECEC] p-10 rounded-[3rem] border border-[#ECECEC] shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-primary/5 rounded-full -ml-16 -mt-16 blur-2xl group-hover:bg-primary/10 transition-all duration-700" />
                    <p className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] mb-4 relative z-10 font-mono">Total Liquidated Payouts</p>
                    <h4 className="text-4xl font-display font-black text-primary relative z-10">৳{formatCurrency(payouts.filter(p => p.status === 'completed').reduce((acc, p) => acc + (p.amount || 0), 0))}</h4>
                </div>
                <div className="bg-[#ECECEC] p-10 rounded-[3rem] border border-[#ECECEC] shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-orange-500/5 rounded-full -ml-16 -mt-16 blur-2xl group-hover:bg-orange-500/10 transition-all duration-700" />
                    <p className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] mb-4 relative z-10 font-mono">Pending Authorizations</p>
                    <h4 className="text-4xl font-display font-black text-orange-500 relative z-10">{payouts.filter(p => p.status === 'pending').length}</h4>
                </div>
                <div className="bg-[#ECECEC] p-10 rounded-[3rem] border border-[#ECECEC] shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-[#ECECEC] rounded-full -ml-16 -mt-16 blur-2xl group-hover:bg-[#ECECEC] transition-all duration-700" />
                    <p className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] mb-4 relative z-10 font-mono">Estimated Liability</p>
                    <h4 className="text-4xl font-display font-black text-[#6B7280] relative z-10">৳{formatCurrency(orders.filter(o => o.status === 'delivered').reduce((acc, o) => acc + (o.total || 0), 0) - payouts.filter(p => p.status === 'completed').reduce((acc, p) => acc + (p.amount || 0), 0))}</h4>
                </div>
            </div>

            <div className="bg-[#ECECEC] rounded-[4rem] border border-[#ECECEC] shadow-2xl overflow-hidden relative">
                <div className="p-10 border-b border-[#ECECEC] flex justify-between items-center bg-black/5">
                    <h4 className="font-display font-black text-lg uppercase tracking-widest text-[#111111]">Neural Settlement Log</h4>
                    <span className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] font-mono">Status: Descending</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-[#FFFFFF] border-b border-[#ECECEC]">
                                <th className="px-10 py-6 text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em]">Entity / Identity</th>
                                <th className="px-10 py-6 text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em]">Asset value</th>
                                <th className="px-10 py-6 text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em]">Medium / Destination</th>
                                <th className="px-10 py-6 text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em]">Authorization Status</th>
                                <th className="px-10 py-6 text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] text-right">Operations</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {payouts.map((payout) => {
                                const targetUser = sellers.find(s => s.id === payout.userId);
                                return (
                                    <tr key={payout.id} className="hover:bg-[#ECECEC] transition-all group">
                                        <td className="px-10 py-8">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-[#FFFFFF] flex items-center justify-center text-[#6B7280] border border-[#ECECEC] shadow-inner">
                                                    <User size={24} />
                                                </div>
                                                <div>
                                                    <p className="text-[14px] font-bold text-[#111111] group-hover:text-primary transition-colors">{targetUser?.displayName || 'Unknown Entity'}</p>
                                                    <p className="text-[9px] font-black text-[#6B7280] uppercase tracking-widest mt-1 font-mono">{payout.role}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <p className="text-[15px] font-black text-primary font-mono tracking-tight">৳{formatCurrency(payout.amount)}</p>
                                        </td>
                                        <td className="px-10 py-8">
                                            <p className="text-[13px] font-bold text-[#6B7280]">{payout.method}</p>
                                            <p className="text-[11px] text-[#6B7280] font-mono mt-1">{payout.account}</p>
                                        </td>
                                        <td className="px-10 py-8">
                                            <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-xl border ${
                                                payout.status === 'completed' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                                payout.status === 'rejected' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                'bg-orange-500/10 text-orange-500 border-orange-500/20'
                                            }`}>
                                                {payout.status}
                                            </span>
                                        </td>
                                        <td className="px-10 py-8 text-right">
                                            {payout.status === 'pending' && (
                                                <div className="flex justify-end gap-4">
                                                    <button 
                                                        onClick={() => adminService.updatePayoutStatus(payout.id, 'rejected')}
                                                        className="w-10 h-10 bg-red-500/5 rounded-xl flex items-center justify-center text-red-500/40 hover:text-red-500 hover:border-red-500 border border-red-500/10 transition-all"
                                                        title="Reject Request"
                                                    >
                                                        <XCircle size={20} />
                                                    </button>
                                                    <button 
                                                        onClick={() => adminService.updatePayoutStatus(payout.id, 'completed')}
                                                        className="w-10 h-10 bg-green-500/5 rounded-xl flex items-center justify-center text-green-500/40 hover:text-green-500 hover:border-green-500 border border-green-500/10 transition-all"
                                                        title="Authorize Transfer"
                                                    >
                                                        <CheckCircle size={20} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {payouts.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-40 text-center">
                                        <p className="text-[#6B7280] text-[11px] font-black uppercase tracking-[0.4em]">No financial records identified</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'promotions' && (
          <motion.div
            key="promotions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-10"
          >
            <div className="flex items-center justify-between">
                <h3 className="font-display font-black text-2xl px-2 flex items-center gap-4 text-[#111111] uppercase tracking-[0.2em]">
                    <Zap size={32} className="text-primary" />
                    Flash Deals & Neural Sales
                </h3>
                <button 
                  onClick={() => setIsAdding(true)}
                  className="px-8 py-4 bg-primary text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3 shadow-xl shadow-primary/20 hover:scale-105 transition-all"
                >
                  <Plus size={18} /> Deploy Flash Deal
                </button>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
                {promotions.length === 0 ? (
                    <div className="text-center py-24 bg-[#ECECEC] rounded-[4rem] border border-dashed border-[#ECECEC]">
                        <Zap size={64} className="mx-auto text-[#6B7280] mb-6" />
                        <p className="text-[11px] font-black text-[#6B7280] uppercase tracking-[0.4em]">No active flash sales in circulation</p>
                    </div>
                ) : (
                    promotions.map(promo => {
                        const isExpired = promo.endTime?.toDate() < new Date();
                        return (
                            <div key={promo.id} className={`p-8 rounded-[3rem] border shadow-2xl flex items-center justify-between group transition-all ${isExpired ? 'bg-[#FFFFFF] border-[#ECECEC] opacity-50 grayscale' : 'bg-[#ECECEC] border-primary/20 hover:border-primary/40'}`}>
                                <div className="flex items-center gap-6">
                                    <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-2xl font-black shadow-inner border ${isExpired ? 'bg-[#ECECEC] text-[#6B7280] border-[#ECECEC]' : 'bg-primary/20 text-primary border-primary/20'}`}>
                                        {promo.percentage}%
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold text-[#111111] mb-1 uppercase tracking-tight">{promo.title}</h4>
                                        <div className="flex items-center gap-4">
                                            <span className="text-[9px] font-black text-[#6B7280] uppercase tracking-widest bg-[#ECECEC] px-2 py-0.5 rounded border border-[#ECECEC]">
                                                Scope: {promo.targetType === 'all' ? 'Universal' : promo.targetType === 'category' ? `Category: ${promo.targetId}` : `Product: ${promo.targetId}`}
                                            </span>
                                            <span className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${isExpired ? 'text-red-500/60' : 'text-primary'}`}>
                                                <Clock size={12} /> {isExpired ? 'OFFLINE' : `EXPIRES: ${promo.endTime?.toDate ? format(promo.endTime.toDate(), 'h:mm a') : '...'}`}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => adminService.deletePromotion(promo.id)}
                                    className="p-4 bg-[#ECECEC] text-[#6B7280] rounded-2xl hover:bg-red-500/10 hover:text-red-500 border border-[#ECECEC] transition-all shadow-xl"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        );
                    })
                )}
            </div>
          </motion.div>
        )}

        {activeTab === 'deals' && (
          <motion.div key="deals" className="space-y-10">
            <div className="flex items-center justify-between">
                <h3 className="font-display font-black text-2xl px-2 flex items-center gap-4 text-[#111111] uppercase tracking-[0.2em]">
                    <Sparkles size={32} className="text-[#E21E26]" />
                    Strategic Deals Hub
                </h3>
                <button 
                  onClick={() => setIsAdding(true)}
                  className="px-10 py-5 bg-[#E21E26] text-white rounded-[2rem] text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-4 shadow-xl shadow-[#E21E26]/20 hover:scale-105 active:scale-95 transition-all"
                >
                  <Plus size={20} /> Create Deal
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {offers.length === 0 ? (
                  <div className="col-span-full py-32 bg-[#ECECEC] border border-dashed border-[#ECECEC] rounded-[4rem] text-center">
                    <Sparkles size={48} className="mx-auto text-[#6B7280] mb-6" />
                    <p className="text-[12px] font-black text-[#6B7280] uppercase tracking-[0.5em]">No Active Strategic Deals</p>
                  </div>
                ) : (
                  offers.map(offer => (
                    <div key={offer.id} className="bg-[#ECECEC] p-10 rounded-[3.5rem] border border-[#ECECEC] shadow-2xl relative overflow-hidden group hover:border-[#E21E26]/30 transition-all">
                        {offer.bannerImage && (
                            <div className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-1000">
                                <img src={offer.bannerImage} className="w-full h-full object-cover" />
                            </div>
                        )}
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <div className="flex items-center gap-3">
                                      <span className="px-3 py-1 bg-[#E21E26] text-white rounded-lg text-[8px] font-black uppercase tracking-widest">{offer.type}</span>
                                      {offer.isActive ? (
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded-full">
                                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                          <span className="text-[7px] text-green-500 font-black uppercase tracking-widest">Active</span>
                                        </div>
                                      ) : (
                                        <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded-full text-[7px] text-red-500 font-black uppercase tracking-widest">Standby</span>
                                      )}
                                    </div>
                                    <h4 className="text-xl font-display font-black text-[#111111] tracking-wide mt-4 uppercase group-hover:text-[#E21E26] transition-colors">{offer.title}</h4>
                                </div>
                            </div>
                            
                            <div className="space-y-4 mb-10">
                              <div className="flex items-center gap-4 text-[10px] font-black text-[#6B7280] uppercase tracking-widest">
                                  <Clock size={16} className="text-[#6B7280]" />
                                  <span>Expires: {offer.endTime ? format(new Date(offer.endTime), 'MMM d, p') : 'Permanent'}</span>
                              </div>
                              <div className="flex items-center gap-4 text-[10px] font-black text-[#6B7280] uppercase tracking-widest">
                                  <Percent size={16} className="text-[#6B7280]" />
                                  <span>Discount: <span className="text-[#E21E26]">{offer.discountAmount}{offer.discountType === 'percentage' ? '%' : '৳'}</span></span>
                              </div>
                              <div className="flex items-center gap-4 text-[10px] font-black text-[#6B7280] uppercase tracking-widest">
                                  <Layout size={16} className="text-[#6B7280]" />
                                  <span>Scope: <span className="text-primary">{offer.targetType}</span></span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-8 border-t border-[#ECECEC]">
                                <div className="flex items-center gap-3">
                                  {offer.sendPush && <Bell size={14} className="text-[#E21E26]" />}
                                  {offer.hasDetailsPage && <FileText size={14} className="text-primary" />}
                                  <span className="text-[9px] font-black text-[#6B7280] uppercase tracking-[0.2em]">
                                      {offer.productIds?.length || 0} Products
                                  </span>
                                </div>
                                <div className="flex gap-2">
                                  <button 
                                      onClick={() => handleBroadcastOffer(offer)}
                                      className="p-4 bg-[#E21E26]/10 border border-[#E21E26]/20 rounded-2xl text-[#E21E26] hover:bg-[#E21E26] hover:text-white transition-all shadow-xl"
                                      title="Broadcast Notification"
                                  >
                                      <Bell size={18} />
                                  </button>
                                  <button 
                                      onClick={() => deleteDoc(doc(db, 'offers', offer.id))}
                                      className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl text-red-500 hover:bg-red-500 hover:text-[#111111] transition-all shadow-xl"
                                  >
                                      <Trash2 size={18} />
                                  </button>
                                </div>
                            </div>
                        </div>
                    </div>
                  ))
                )}
            </div>
          </motion.div>
        )}

        {activeTab === 'coupons' && (
          <motion.div key="coupons" className="space-y-10">
            <div className="flex items-center justify-between">
                <h3 className="font-display font-black text-2xl px-2 flex items-center gap-4 text-[#111111] uppercase tracking-[0.2em]">
                    <Percent size={32} className="text-[#E21E26]" />
                    Coupon Protocols & Vouchers
                </h3>
                <button 
                  onClick={() => setIsAdding(true)}
                  className="px-8 py-4 bg-[#E21E26] text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3 shadow-xl shadow-[#E21E26]/20 hover:scale-105 transition-all"
                >
                  <Plus size={18} /> Generate Token
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {coupons.map(coupon => (
                    <div key={coupon.id} className="bg-[#ECECEC] p-8 rounded-[3rem] border border-[#ECECEC] shadow-2xl relative overflow-hidden group hover:border-[#E21E26]/30 transition-all">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-[#E21E26]/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-[#E21E26]/10 transition-all" />
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h4 className="text-2xl font-display font-black text-[#111111] tracking-widest">{coupon.code}</h4>
                                <p className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.2em] mt-1">{coupon.type === 'percentage' ? `${coupon.value}% Discount` : `৳${formatCurrency(coupon.value)} Flat Discount`}</p>
                            </div>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${coupon.isActive ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                                <Zap size={20} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="p-4 bg-[#FFFFFF] rounded-2xl border border-[#ECECEC]">
                                <span className="text-[8px] font-black text-[#6B7280] uppercase tracking-[0.2em] block mb-1">Used Count</span>
                                <p className="text-lg font-black text-[#111111]">{coupon.usedCount || 0} / {coupon.usageLimit}</p>
                            </div>
                            <div className="p-4 bg-[#FFFFFF] rounded-2xl border border-[#ECECEC]">
                                <span className="text-[8px] font-black text-[#6B7280] uppercase tracking-[0.2em] block mb-1">Min Order</span>
                                <p className="text-lg font-black text-[#E21E26]">৳{formatCurrency(coupon.minOrder)}</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black text-[#6B7280] uppercase tracking-widest italic">Exp: {coupon.expiryDate || 'Perpetual'}</span>
                            <button 
                                onClick={() => adminService.deleteCoupon(coupon.id)}
                                className="w-10 h-10 bg-[#ECECEC] border border-[#ECECEC] rounded-xl flex items-center justify-center text-[#6B7280] hover:text-red-500 hover:border-red-500/40 transition-all shadow-xl active:scale-95"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'abandonment' && (
          <motion.div key="abandonment" className="space-y-10">
            <div className="flex items-center justify-between">
                <h3 className="font-display font-black text-2xl px-2 flex items-center gap-4 text-[#111111] uppercase tracking-[0.2em]">
                    <Trash2 size={32} className="text-orange-500" />
                    Abandoned Cart Recovery
                </h3>
                <button 
                  onClick={async () => {
                    const res = await fetch('/api/cart/recover-pings');
                    const data = await res.json();
                    alert(`Signal Sequence Initiated: ${data.recoveryTriggered} Recoveries Pulsed`);
                  }}
                  className="px-8 py-4 bg-orange-500 text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3 shadow-xl shadow-orange-500/20 hover:scale-105 transition-all"
                >
                  <Zap size={18} /> Pulse Recovery Signals
                </button>
            </div>

            <div className="bg-[#ECECEC] rounded-[3rem] border border-[#ECECEC] shadow-2xl overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-[#FFFFFF] border-b border-[#ECECEC]">
                            <th className="px-10 py-6 text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em]">Customer Node</th>
                            <th className="px-10 py-6 text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em]">Asset Value</th>
                            <th className="px-10 py-6 text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em]">Payload Density</th>
                            <th className="px-10 py-6 text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em]">Signal Echo</th>
                            <th className="px-10 py-6 text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] text-right">Ops</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {abandonedCarts.map(cart => (
                            <tr key={cart.id} className="hover:bg-[#ECECEC] transition-all group">
                                <td className="px-10 py-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-[#FFFFFF] border border-[#ECECEC] rounded-2xl flex items-center justify-center text-[#6B7280]">
                                            <User size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-[#111111] group-hover:text-orange-400 transition-colors">User: {cart.userId?.slice(-8)}</p>
                                            <p className="text-[10px] text-[#6B7280] font-black uppercase tracking-widest mt-1">Status: Abandoned</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-10 py-8">
                                    <p className="text-lg font-black text-orange-500 font-mono tracking-tight">৳{formatCurrency(cart.total)}</p>
                                </td>
                                <td className="px-10 py-8">
                                    <p className="text-[13px] font-bold text-[#6B7280]">{cart.items?.length || 0} Discrete Units</p>
                                </td>
                                <td className="px-10 py-8">
                                    <p className="text-[11px] font-mono text-[#6B7280]">
                                        {cart.createdAt?.toDate ? format(cart.createdAt.toDate(), 'MMM d, h:mm a') : 'Now'}
                                    </p>
                                </td>
                                <td className="px-10 py-8 text-right">
                                    <button 
                                        className="w-10 h-10 bg-[#ECECEC] border border-[#ECECEC] rounded-xl flex items-center justify-center text-[#6B7280] hover:text-orange-400 hover:border-orange-400/40 transition-all shadow-xl active:scale-95"
                                        title="Inspect Payload"
                                    >
                                        <Eye size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {abandonedCarts.length === 0 && (
                            <tr>
                                <td colSpan={5} className="py-32 text-center">
                                    <p className="text-[#6B7280] text-[11px] font-black uppercase tracking-[0.4em]">No abandoned assets identified</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'pages' && (
            <motion.div
                key="pages"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-10"
            >
                <div className="flex items-center justify-between">
                    <h3 className="font-display font-black text-2xl px-2 flex items-center gap-4 text-[#111111] uppercase tracking-[0.2em]">
                        <Layout size={32} className="text-[#E21E26]" />
                        Dynamic Page Manager
                    </h3>
                    <button 
                        onClick={() => {
                            setEditingPageId(null);
                            setNewPage({
                                title: '',
                                slug: '',
                                content: '',
                                isVisible: true,
                                seoTitle: '',
                                seoDescription: '',
                                seoKeywords: ''
                            });
                            setIsAdding(true);
                        }}
                        className="px-8 py-4 bg-[#E21E26] text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3 shadow-sm hover:scale-105 transition-all"
                    >
                        <Plus size={18} /> Add New Page
                    </button>
                </div>
                
                <div className="grid grid-cols-1 gap-6">
                    {pages.length === 0 ? (
                        <div className="text-center py-24 bg-[#F9FAFB] rounded-[4rem] border border-dashed border-[#ECECEC]">
                            <Layout size={64} className="mx-auto text-[#ECECEC] mb-6" />
                            <p className="text-[11px] font-black text-[#6B7280]/60 uppercase tracking-[0.4em]">Grid currently vacant</p>
                        </div>
                    ) : (
                        pages.map(page => (
                            <div key={page.id} className="p-8 bg-white rounded-[3rem] border border-[#ECECEC] shadow-sm flex items-center justify-between group transition-all hover:border-[#E21E26]/30">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 bg-[#F9FAFB] border border-[#ECECEC] rounded-3xl flex items-center justify-center text-[#E21E26] shadow-inner">
                                        <Globe size={28} />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold text-[#111111] mb-1 uppercase tracking-tight">{page.title}</h4>
                                        <div className="flex items-center gap-4">
                                            <span className="text-[9px] font-black text-[#6B7280] uppercase tracking-widest bg-[#F9FAFB] px-2 py-0.5 rounded border border-[#ECECEC] font-mono">
                                                Path: /{page.slug}
                                            </span>
                                            <span className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${page.isVisible ? 'text-green-600' : 'text-red-600'}`}>
                                                {page.isVisible ? <Eye size={12} /> : <EyeOff size={12} />} {page.isVisible ? 'VISIBLE' : 'HIDDEN'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={() => startEditingPage(page)}
                                        className="p-4 bg-[#F9FAFB] text-[#6B7280] rounded-2xl hover:bg-white hover:text-[#111111] border border-[#ECECEC] transition-all shadow-sm"
                                    >
                                        <Settings size={20} />
                                    </button>
                                    <button 
                                        onClick={() => adminService.deletePage(page.id)}
                                        className="p-4 bg-[#F9FAFB] text-[#6B7280] rounded-2xl hover:bg-red-50 hover:text-red-600 border border-[#ECECEC] transition-all shadow-sm"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </motion.div>
        )}
      </AnimatePresence>
          </main>
        </div>
      
      {selectedOrder && (
        <Invoice order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}

      {/* Promotion Modal */}
      <AnimatePresence>
        {isAdding && activeTab === 'promotions' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-black/5 backdrop-blur-3xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-[#F5F5F7] border border-[#ECECEC] rounded-[3.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.8)] p-12 overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-40" />
              <h3 className="font-display font-black text-2xl text-[#111111] mb-10 flex items-center gap-4 uppercase tracking-[0.2em]">
                  <Zap size={28} className="text-primary" /> Deploy Sale
              </h3>

              <div className="space-y-8">
                  <div className="space-y-3">
                      <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] ml-2 font-mono">Mission Alias (Title)</label>
                      <input 
                          placeholder="e.g. Midnight Surge..." 
                          className="w-full px-8 py-5 bg-[#FFFFFF] border border-[#ECECEC] rounded-3xl text-sm text-[#111111] outline-none focus:border-primary/40 font-bold transition-all"
                          value={newPromotion.title}
                          onChange={e => setNewPromotion({...newPromotion, title: e.target.value})}
                      />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                          <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] ml-2 font-mono">Discount Index (%)</label>
                          <input 
                              type="number" 
                              placeholder="5" 
                              className="w-full px-8 py-5 bg-[#FFFFFF] border border-[#ECECEC] rounded-3xl text-sm text-[#111111] outline-none focus:border-primary/40 text-center font-black"
                              value={newPromotion.percentage || 0}
                              onChange={e => setNewPromotion({...newPromotion, percentage: parseInt(e.target.value) || 0})}
                          />
                      </div>
                      <div className="space-y-3">
                          <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] ml-2 font-mono">Temporal Window (Hours)</label>
                          <select 
                              className="w-full px-8 py-5 bg-[#FFFFFF] border border-[#ECECEC] rounded-3xl text-sm text-[#111111] outline-none focus:border-primary/40 appearance-none text-center font-black"
                              value={newPromotion.duration}
                              onChange={e => setNewPromotion({...newPromotion, duration: parseInt(e.target.value) || 1})}
                          >
                              <option value="1">1 Hour Pulse</option>
                              <option value="2">2 Hour Shift</option>
                              <option value="4">4 Hour Cycle</option>
                              <option value="12">12 Hour Phase</option>
                              <option value="24">24 Hour Rotation</option>
                              <option value="48">48 Hour Extended</option>
                          </select>
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                          <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] ml-2 font-mono">Target Protocol</label>
                          <select 
                              className="w-full px-8 py-5 bg-[#FFFFFF] border border-[#ECECEC] rounded-3xl text-sm text-[#111111] outline-none focus:border-primary/40 appearance-none text-center font-bold"
                              value={newPromotion.targetType}
                              onChange={e => setNewPromotion({...newPromotion, targetType: e.target.value, targetId: ''})}
                          >
                              <option value="all">Universal (All)</option>
                              <option value="category">Category-Specific</option>
                              <option value="product">Product-Specific</option>
                          </select>
                      </div>
                      {newPromotion.targetType !== 'all' && (
                          <div className="space-y-3">
                              <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] ml-2 font-mono">Target Identifier</label>
                              <select 
                                  className="w-full px-8 py-5 bg-[#FFFFFF] border border-[#ECECEC] rounded-3xl text-sm text-[#111111] outline-none focus:border-primary/40 appearance-none text-center font-bold"
                                  value={newPromotion.targetId}
                                  onChange={e => setNewPromotion({...newPromotion, targetId: e.target.value})}
                              >
                                  <option value="">Select Target...</option>
                                  {newPromotion.targetType === 'category' ? 
                                      categories.map(c => <option key={c.id} value={c.title}>{c.title}</option>) : 
                                      products.filter(p => p.status === 'approved').map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                                  }
                              </select>
                          </div>
                      )}
                  </div>

                  <button 
                      onClick={handleAddPromotion}
                      className="w-full py-6 mt-4 bg-primary text-black rounded-[2.5rem] font-black text-xs uppercase tracking-[0.4em] shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                      Execute Deployment
                  </button>
              </div>
            </motion.div>
          </div>
        )}

        {isAdding && activeTab === 'deals' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-black/5 backdrop-blur-3xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-4xl bg-white border border-[#ECECEC] rounded-[3.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.8)] p-12 overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <h3 className="font-display font-black text-2xl text-[#111111] mb-10 flex items-center gap-4 uppercase tracking-[0.2em]">
                  <Sparkles size={28} className="text-[#E21E26]" /> Deploy Strategic Deal
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Left Column: Basic Info & Discount */}
                <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] font-mono">Deal Identity (Name)</label>
                    <input 
                      className="w-full px-8 py-5 bg-[#FFFFFF] border border-[#ECECEC] rounded-3xl text-sm text-[#111111] outline-none focus:border-[#E21E26]/40 font-black tracking-widest"
                      value={newOffer.title}
                      placeholder="E.g. Lunar Midnight Sale"
                      onChange={e => setNewOffer({...newOffer, title: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] font-mono">Deal Archetype</label>
                      <select 
                        className="w-full px-8 py-5 bg-[#FFFFFF] border border-[#ECECEC] rounded-3xl text-[11px] text-[#111111] outline-none font-black appearance-none"
                        value={newOffer.type}
                        onChange={e => setNewOffer({...newOffer, type: e.target.value as any})}
                      >
                        <option value="flash">Flash Deal</option>
                        <option value="midnight">Midnight Pulse</option>
                        <option value="festival">Festival Gala</option>
                        <option value="category">Category Strike</option>
                        <option value="product">Product Specific</option>
                        <option value="weekend">Weekend Special</option>
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] font-mono">Discount Logic</label>
                      <select 
                        className="w-full px-8 py-5 bg-[#FFFFFF] border border-[#ECECEC] rounded-3xl text-[11px] text-[#111111] outline-none font-black appearance-none"
                        value={newOffer.discountType}
                        onChange={e => setNewOffer({...newOffer, discountType: e.target.value as any})}
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed Amount (৳)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] font-mono">Benefit Value</label>
                      <input 
                        type="number"
                        className="w-full px-8 py-5 bg-[#FFFFFF] border border-[#ECECEC] rounded-3xl text-sm text-[#111111] outline-none focus:border-[#E21E26]/40 font-black"
                        value={newOffer.discountAmount || 0}
                        onChange={e => setNewOffer({...newOffer, discountAmount: parseInt(e.target.value) || 0})}
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] font-mono">Target Scope</label>
                      <select 
                        className="w-full px-8 py-5 bg-[#FFFFFF] border border-[#ECECEC] rounded-3xl text-[11px] text-[#111111] outline-none font-black appearance-none"
                        value={newOffer.targetType}
                        onChange={e => setNewOffer({...newOffer, targetType: e.target.value as any, categoryId: '', subCategoryId: '', productIds: []})}
                      >
                        <option value="all">Global (All Products)</option>
                        <option value="category">Categorical Target</option>
                        <option value="subcategory">Segment Target</option>
                        <option value="products">Precision Target (Selected)</option>
                      </select>
                    </div>
                  </div>

                  {newOffer.targetType === 'category' && (
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] font-mono">Primary Vector (Category)</label>
                      <select 
                        className="w-full px-8 py-5 bg-[#FFFFFF] border border-[#ECECEC] rounded-3xl text-[11px] text-[#111111] outline-none font-black appearance-none"
                        value={newOffer.categoryId}
                        onChange={e => setNewOffer({...newOffer, categoryId: e.target.value})}
                      >
                        <option value="">Select Category...</option>
                        {categories.map(c => <option key={c.id} value={c.title}>{c.title}</option>)}
                      </select>
                    </div>
                  )}

                  {newOffer.targetType === 'products' && (
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] font-mono">Product Matrix (IDs)</label>
                      <div className="relative">
                        <input 
                          placeholder="Select multiple products..."
                          className="w-full px-8 py-5 bg-[#FFFFFF] border border-[#ECECEC] rounded-3xl text-sm text-[#111111] outline-none focus:border-[#E21E26]/40 font-bold"
                          readOnly
                          onClick={() => {
                            // Quick toggle logic could go here - for now let's use a simpler prompt/multiselect if needed
                            const id = prompt('Enter Product ID to add:');
                            if(id && !newOffer.productIds.includes(id)) setNewOffer({...newOffer, productIds: [...newOffer.productIds, id]});
                          }}
                        />
                        <div className="flex flex-wrap gap-2 mt-3">
                          {newOffer.productIds.map(id => (
                            <span key={id} onClick={() => setNewOffer({...newOffer, productIds: newOffer.productIds.filter(pid => pid !== id)})} className="px-3 py-1 bg-[#ECECEC] rounded-full text-[9px] font-bold cursor-pointer hover:bg-red-500/20">
                              {id.slice(0, 8)} ⨯
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] font-mono">Manifest Time</label>
                      <input 
                        type="datetime-local" 
                        className="w-full px-8 py-5 bg-[#FFFFFF] border border-[#ECECEC] rounded-3xl text-[11px] text-[#111111] outline-none"
                        value={newOffer.startTime}
                        onChange={e => setNewOffer({...newOffer, startTime: e.target.value})}
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] font-mono">Termination Node</label>
                      <input 
                        type="datetime-local" 
                        className="w-full px-8 py-5 bg-[#FFFFFF] border border-[#ECECEC] rounded-3xl text-[11px] text-[#111111] outline-none font-black"
                        value={newOffer.endTime}
                        onChange={e => setNewOffer({...newOffer, endTime: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column: Communications & Experience */}
                <div className="space-y-8">
                  {/* Push Notification Panel */}
                  <div className="p-8 bg-blue-500/5 border border-blue-500/20 rounded-[3rem] space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Bell size={24} className="text-[#E21E26]" />
                        <div>
                          <h4 className="text-sm font-black text-[#111111] uppercase tracking-widest">Universal Echo</h4>
                          <p className="text-[9px] text-[#6B7280] font-bold uppercase tracking-widest">Broadcast Alert On Deployment</p>
                        </div>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={newOffer.sendPush} 
                        onChange={e => setNewOffer({...newOffer, sendPush: e.target.checked})}
                        className="w-10 h-10 rounded-2xl accent-secondary cursor-pointer"
                      />
                    </div>

                    {newOffer.sendPush && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                        className="space-y-4 pt-4 border-t border-[#ECECEC]"
                      >
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-[#6B7280] uppercase tracking-[0.2em] ml-2">Broadcast Header</label>
                          <input 
                            className="w-full px-6 py-4 bg-[#FFFFFF] border border-[#ECECEC] rounded-2xl text-[13px] text-[#111111] outline-none focus:border-[#E21E26]/20"
                            value={newOffer.pushTitle}
                            placeholder="🔥 MEGA SALE Pulse Detected!"
                            onChange={e => setNewOffer({...newOffer, pushTitle: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-[#6B7280] uppercase tracking-[0.2em] ml-2">Neural Payload</label>
                          <textarea 
                            className="w-full px-6 py-4 bg-[#FFFFFF] border border-[#ECECEC] rounded-2xl text-[13px] text-[#111111] outline-none focus:border-[#E21E26]/20 h-24 resize-none"
                            value={newOffer.pushBody}
                            placeholder="Inject campaign narrative..."
                            onChange={e => setNewOffer({...newOffer, pushBody: e.target.value})}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-[#6B7280] uppercase tracking-[0.2em] ml-2">Redirect Logic</label>
                            <select 
                              className="w-full px-6 py-4 bg-[#FFFFFF] border border-[#ECECEC] rounded-2xl text-[11px] text-[#111111] outline-none appearance-none font-bold"
                              value={newOffer.redirectType}
                              onChange={e => setNewOffer({...newOffer, redirectType: e.target.value as any, redirectId: ''})}
                            >
                              <option value="deal">Specific Deal</option>
                              <option value="category">Category Portal</option>
                              <option value="product">Product Node</option>
                              <option value="custom">External Stream</option>
                            </select>
                          </div>
                   <div className="space-y-2">
                            <label className="text-[9px] font-black text-[#6B7280] uppercase tracking-[0.2em] ml-2">Vector ID</label>
                            <input 
                              className="w-full px-6 py-4 bg-[#FFFFFF] border border-[#ECECEC] rounded-2xl text-[11px] text-[#111111] outline-none"
                              value={newOffer.redirectId}
                              placeholder="ID or URL"
                              onChange={e => setNewOffer({...newOffer, redirectId: e.target.value})}
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Details Page Panel */}
                  <div className="p-8 bg-[#E21E26]/5 border border-[#E21E26]/20 rounded-[3rem] space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <FileText size={24} className="text-primary" />
                        <div>
                          <h4 className="text-sm font-black text-[#111111] uppercase tracking-widest">Immersive Portal</h4>
                          <p className="text-[9px] text-[#6B7280] font-bold uppercase tracking-widest">Genesis Custom Details Page</p>
                        </div>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={newOffer.hasDetailsPage} 
                        onChange={e => setNewOffer({...newOffer, hasDetailsPage: e.target.checked})}
                        className="w-10 h-10 rounded-2xl accent-primary cursor-pointer"
                      />
                    </div>

                    {newOffer.hasDetailsPage && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                        className="space-y-4 pt-4 border-t border-[#ECECEC]"
                      >
                       <div className="space-y-2">
                          <label className="text-[9px] font-black text-[#6B7280] uppercase tracking-[0.2em] ml-2">Manifesto Title</label>
                          <input 
                            className="w-full px-6 py-4 bg-[#FFFFFF] border border-[#ECECEC] rounded-2xl text-[13px] text-[#111111] outline-none"
                            value={newOffer.detailsTitle}
                            onChange={e => setNewOffer({...newOffer, detailsTitle: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-[#6B7280] uppercase tracking-[0.2em] ml-2">Narrative Content</label>
                          <textarea 
                            className="w-full px-6 py-4 bg-[#FFFFFF] border border-[#ECECEC] rounded-2xl text-[13px] text-[#111111] outline-none h-32 resize-none"
                            value={newOffer.detailsDescription}
                            onChange={e => setNewOffer({...newOffer, detailsDescription: e.target.value})}
                          />
                        </div>
                        <ImageUpload 
                          onUpload={url => setNewOffer({...newOffer, detailsBanner: url})} 
                          currentImage={newOffer.detailsBanner} 
                          label="Portal Visual (Banner)" 
                        />
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 mt-12">
                <button 
                  onClick={() => setIsAdding(false)}
                  className="flex-1 py-8 bg-[#ECECEC] text-[#6B7280] rounded-[2.5rem] font-black text-xs uppercase tracking-[0.4em] hover:bg-[#ECECEC] transition-all"
                >
                  Abort Mission
                </button>
                <button 
                  onClick={handleCreateOffer}
                  className="flex-[2] py-8 bg-[#E21E26] text-white rounded-[2.5rem] font-black text-xs uppercase tracking-[0.4em] shadow-[0_15px_40px_rgba(255,215,0,0.2)] hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Authorize Deployment
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {isAdding && activeTab === 'coupons' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-black/5 backdrop-blur-3xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-[#F5F5F7] border border-[#ECECEC] rounded-[3.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.8)] p-12 overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-secondary to-transparent opacity-40" />
              <h3 className="font-display font-black text-2xl text-[#111111] mb-10 flex items-center gap-4 uppercase tracking-[0.2em]">
                  <Percent size={28} className="text-[#E21E26]" /> Manifest Token
              </h3>

              <div className="space-y-6">
                  <div className="space-y-3">
                      <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] ml-2 font-mono">Token Access Code</label>
                      <input 
                          placeholder="e.g. MEGA500..." 
                          className="w-full px-8 py-5 bg-[#FFFFFF] border border-[#ECECEC] rounded-3xl text-lg text-[#111111] outline-none focus:border-[#E21E26]/40 font-black tracking-widest transition-all text-center uppercase"
                          value={newCoupon.code}
                          onChange={e => setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})}
                      />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                          <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] ml-2 font-mono">Protocol Type</label>
                          <select 
                              className="w-full px-8 py-5 bg-[#FFFFFF] border border-[#ECECEC] rounded-3xl text-sm text-[#111111] outline-none focus:border-[#E21E26]/40 text-center font-black appearance-none"
                              value={newCoupon.type}
                              onChange={e => setNewCoupon({...newCoupon, type: e.target.value as any})}
                          >
                              <option value="percentage">Percentage (%)</option>
                              <option value="flat">Flat Amount (৳)</option>
                          </select>
                      </div>
                      <div className="space-y-3">
                          <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] ml-2 font-mono">Index Value</label>
                          <input 
                              type="number" 
                              className="w-full px-8 py-5 bg-[#FFFFFF] border border-[#ECECEC] rounded-3xl text-sm text-[#111111] outline-none focus:border-[#E21E26]/40 text-center font-black"
                              value={newCoupon.value || 0}
                              onChange={e => setNewCoupon({...newCoupon, value: parseInt(e.target.value) || 0})}
                          />
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                          <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] ml-2 font-mono">Min Threshold (৳)</label>
                          <input 
                              type="number" 
                              className="w-full px-8 py-5 bg-[#FFFFFF] border border-[#ECECEC] rounded-3xl text-sm text-[#111111] outline-none focus:border-[#E21E26]/40 text-center font-black"
                              value={newCoupon.minOrder || 0}
                              onChange={e => setNewCoupon({...newCoupon, minOrder: parseInt(e.target.value) || 0})}
                          />
                      </div>
                      <div className="space-y-3">
                          <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] ml-2 font-mono">Usage Limit</label>
                          <input 
                              type="number" 
                              className="w-full px-8 py-5 bg-[#FFFFFF] border border-[#ECECEC] rounded-3xl text-sm text-[#111111] outline-none focus:border-[#E21E26]/40 text-center font-black"
                              value={newCoupon.usageLimit || 0}
                              onChange={e => setNewCoupon({...newCoupon, usageLimit: parseInt(e.target.value) || 0})}
                          />
                      </div>
                  </div>

                  <div className="space-y-3">
                      <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] ml-2 font-mono">Expiration Chronology</label>
                      <input 
                          type="date" 
                          className="w-full px-8 py-5 bg-[#FFFFFF] border border-[#ECECEC] rounded-3xl text-sm text-[#111111] outline-none focus:border-[#E21E26]/40 text-center font-black"
                          value={newCoupon.expiryDate}
                          onChange={e => setNewCoupon({...newCoupon, expiryDate: e.target.value})}
                      />
                  </div>

                  <button 
                      onClick={handleCreateCoupon}
                      className="w-full py-6 mt-4 bg-[#E21E26] text-white rounded-[2.5rem] font-black text-xs uppercase tracking-[0.4em] shadow-2xl shadow-[#E21E26]/20 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                      Register Token
                  </button>
              </div>
            </motion.div>
          </div>
        )}

        {isAdding && activeTab === 'pages' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-10">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-black/5 backdrop-blur-3xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white border border-[#ECECEC] rounded-[3.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.1)] p-12 overflow-y-auto max-h-[90vh] scrollbar-hide"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-[#E21E26] opacity-40" />
              <div className="flex justify-between items-start mb-10">
                <h3 className="font-display font-black text-2xl text-[#111111] flex items-center gap-4 uppercase tracking-[0.2em]">
                    <Layout size={28} className="text-[#E21E26]" /> {editingPageId ? 'Edit Page' : 'Create Page'}
                </h3>
                <button onClick={() => setIsAdding(false)} className="p-2 bg-[#F9FAFB] border border-[#ECECEC] rounded-xl text-[#6B7280] hover:text-[#111111]">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                          <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] ml-2 font-mono">Page Title</label>
                          <input 
                              placeholder="e.g. Privacy Policy..." 
                              className="w-full px-8 py-5 bg-[#F9FAFB] border border-[#ECECEC] rounded-3xl text-sm text-[#111111] outline-none focus:border-[#E21E26]/40 font-bold transition-all"
                              value={newPage.title}
                              onChange={e => setNewPage({...newPage, title: e.target.value})}
                          />
                      </div>
                      <div className="space-y-3">
                          <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] ml-2 font-mono">Page URL (Slug)</label>
                          <input 
                              placeholder="e.g. privacy-policy" 
                              className="w-full px-8 py-5 bg-[#F9FAFB] border border-[#ECECEC] rounded-3xl text-sm text-[#111111] outline-none focus:border-[#E21E26]/40 font-mono transition-all"
                              value={newPage.slug}
                              onChange={e => setNewPage({...newPage, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                          />
                      </div>
                  </div>

                  <div className="space-y-3">
                      <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] ml-2 font-mono">Page Content (Markdown supports formatting)</label>
                      <textarea 
                          placeholder="Enter page content in markdown format..." 
                          className="w-full px-8 py-6 bg-[#F9FAFB] border border-[#ECECEC] rounded-[2.5rem] text-sm text-[#111111] outline-none focus:border-[#E21E26]/40 h-64 resize-none leading-relaxed font-sans"
                          value={newPage.content}
                          onChange={e => setNewPage({...newPage, content: e.target.value})}
                      />
                  </div>

                  <div className="bg-[#F9FAFB] p-8 rounded-[2.5rem] border border-[#ECECEC] space-y-4">
                      <h4 className="text-[10px] font-black text-[#E21E26] uppercase tracking-[0.3em] flex items-center gap-2">
                          <Search size={14} /> SEO Details
                      </h4>
                      <div className="grid grid-cols-1 gap-4">
                          <input 
                              placeholder="SEO Meta Title" 
                              className="w-full px-6 py-4 bg-white border border-[#ECECEC] rounded-2xl text-xs text-[#111111]"
                              value={newPage.seoTitle}
                              onChange={e => setNewPage({...newPage, seoTitle: e.target.value})}
                          />
                          <textarea 
                              placeholder="SEO Meta Description (optional)" 
                              className="w-full px-6 py-4 bg-white border border-[#ECECEC] rounded-2xl text-xs text-[#111111] h-20 resize-none"
                              value={newPage.seoDescription}
                              onChange={e => setNewPage({...newPage, seoDescription: e.target.value})}
                          />
                          <input 
                              placeholder="Keywords (comma separated)" 
                              className="w-full px-6 py-4 bg-white border border-[#ECECEC] rounded-2xl text-xs text-[#111111]"
                              value={newPage.seoKeywords}
                              onChange={e => setNewPage({...newPage, seoKeywords: e.target.value})}
                          />
                      </div>
                  </div>

                  <div className="flex items-center justify-between px-6 py-4 bg-[#F9FAFB] border border-[#ECECEC] rounded-[2rem]">
                      <div className="flex items-center gap-3">
                          <Eye size={18} className="text-[#E21E26]" />
                          <span className="text-[10px] font-black text-[#6B7280] uppercase tracking-widest">Visibility</span>
                      </div>
                      <button 
                          onClick={() => setNewPage({...newPage, isVisible: !newPage.isVisible})}
                          className={`w-12 h-6 rounded-full transition-all relative ${newPage.isVisible ? 'bg-[#E21E26]' : 'bg-[#ECECEC]'}`}
                      >
                          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${newPage.isVisible ? 'right-1' : 'left-1'}`} />
                      </button>
                  </div>

                  <button 
                      onClick={handleAddPage}
                      className="w-full py-6 bg-[#E21E26] text-white rounded-[2.5rem] font-black text-xs uppercase tracking-[0.4em] shadow-xl shadow-[#E21E26]/20 hover:scale-[1.02] transition-all active:scale-95 mt-4"
                  >
                      {editingPageId ? 'Save Changes' : 'Create Page'}
                  </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </motion.div>
  );
}
