import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
  Keyboard,
} from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getVehicleData, logout, getCompanyId } from '../api/auth';
import Sidebar from './Sidebar'; 
import * as ScreenOrientation from 'expo-screen-orientation';

const HomeScreen = ({ onLogout }) => {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  // State
  const [userCompanyId, setUserCompanyId] = useState(null);
  const [userName, setUserName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const webViewRef = useRef(null);
  const intervalRef = useRef(null);


  useEffect(() => {
    const setOrientation = async () => {
      if (activeMenu === 'dashboard') {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      } else {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      }
    };

    setOrientation();

    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, [activeMenu]); 

  useEffect(() => {
    const loadCompanyId = async () => {
      try {
        const companyId = await getCompanyId();
        const storedUserName = await AsyncStorage.getItem('userName');
        setUserName(storedUserName || 'Guest');
        if (companyId) setUserCompanyId(String(companyId));
        else setIsLoading(false);
      } catch (e) {
        setIsLoading(false);
      }
    };
    loadCompanyId();
  }, []);

  useEffect(() => {
    if (userCompanyId) {
      fetchData();
      intervalRef.current = setInterval(() => { fetchData(); }, 60000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [userCompanyId]);

  useEffect(() => {
    if (searchTerm) {
      setFilteredData(data.filter(item =>
        item.alias?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.vehicleid?.toLowerCase().includes(searchTerm.toLowerCase())
      ));
    } else {
      setFilteredData(data);
    }
  }, [data, searchTerm]);

  const fetchData = async () => {
    try {
      const result = await getVehicleData();
      if (result.success) setData(result.data);
    } catch (e) {} 
    finally { setIsLoading(false); setRefreshing(false); }
  };

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Yakin ingin keluar?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
        await logout();
        // Kunci kembali ke Portrait saat logout
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        onLogout();
      }},
    ]);
  };
  
  const getMapMarkers = () => {
    return filteredData.map((item) => {
      const lat = item.latitude || item.lat;
      const lng = item.longitude || item.lng;
      if (!lat || !lng) return null;
      return { id: item.vehicleid, lat: parseFloat(lat), lng: parseFloat(lng), label: item.alias || item.vehicleid };
    }).filter(Boolean);
  };

  const leafletHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>body { margin: 0; padding: 0; background-color: #F3F4F6; } #map { height: 100vh; width: 100vw; }</style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', { zoomControl: false }).setView([-2.5, 118], 5);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {}).addTo(map);
        L.control.zoom({ position: 'bottomright' }).addTo(map);
        var markersLayer = L.layerGroup().addTo(map);
        window.updateMarkers = function(markersJson) {
          var data = JSON.parse(markersJson); markersLayer.clearLayers();
          data.forEach(function(v) {
            var marker = L.circleMarker([v.lat, v.lng], { radius: 8, fillColor: "#2563EB", color: "#fff", weight: 2, opacity: 1, fillOpacity: 0.9 }).addTo(markersLayer);
            marker.bindPopup('<b style="color:#000">' + v.label + '</b>');
            marker.on('click', function() { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SELECT_VEHICLE', id: v.id })); });
          });
        };
        window.panTo = function(lat, lng) { map.setView([lat, lng], 15, { animate: true }); };
      </script>
    </body>
    </html>
  `;

  const handleWebViewMessage = (event) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data);
      if (payload.type === 'SELECT_VEHICLE') {
        const vehicle = filteredData.find(v => v.vehicleid === payload.id);
        if (vehicle) handleSelectVehicle(vehicle);
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (webViewRef.current && filteredData.length > 0 && activeMenu === 'dashboard') {
      const markers = getMapMarkers();
      webViewRef.current.injectJavaScript(`updateMarkers('${JSON.stringify(markers)}'); true;`);
    }
  }, [filteredData, activeMenu]);

  const handleSelectVehicle = (item) => {
    setSelectedVehicleId(item.vehicleid);
    const lat = item.latitude || item.lat;
    const lng = item.longitude || item.lng;
    if (lat && lng && webViewRef.current) {
      webViewRef.current.injectJavaScript(`panTo(${lat}, ${lng}); true;`);
    }
  };

  const renderContent = () => {
    if (activeMenu !== 'dashboard') {
      return (
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderIcon}>{activeMenu === 'history' ? '📜' : '⚙️'}</Text>
          <Text style={[styles.placeholderText, styles.textDark]}>{activeMenu === 'history' ? 'Halaman Riwayat' : 'Halaman Pengaturan'}</Text>
          <Text style={styles.placeholderSub}>Fitur ini sedang dalam pengembangan.</Text>
        </View>
      );
    }

    return (
      <>
        {!isLandscape && (
          <View style={styles.searchOverlay}>
            <TextInput 
              style={styles.searchInput} 
              placeholder="Search Vehicle..." 
              placeholderTextColor="#9CA3AF" 
              value={searchTerm} 
              onChangeText={setSearchTerm} 
            />
          </View>
        )}

        <View style={[styles.mainContent, isLandscape && styles.mainContentLandscape]}>
            <View style={[styles.mapContainer, isLandscape && styles.mapContainerLandscape]}>
              <WebView 
                ref={webViewRef} 
                source={{ html: leafletHtml }} 
                style={styles.map} 
                onMessage={handleWebViewMessage} 
                originWhitelist={['*']} 
                javaScriptEnabled={true} 
                domStorageEnabled={true} 
                startInLoadingState={true} 
                renderLoading={() => <View style={styles.mapLoading}><ActivityIndicator color="#2563EB" /></View>} 
              />
            </View>

            <View style={[styles.tableContainer, isLandscape && styles.tableContainerLandscape]}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableHeaderText}>Vehicle List ({filteredData.length})</Text>
                {isLandscape && (
                   <TextInput 
                   style={styles.searchInputInline} 
                   placeholder="Search..." 
                   placeholderTextColor="#9CA3AF" 
                   value={searchTerm} 
                   onChangeText={setSearchTerm} 
                 />
                )}
              </View>
              <FlatList 
                data={filteredData} 
                keyExtractor={item => item.vehicleid} 
                renderItem={renderTableItem} 
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" colors={["#2563EB"]} />} 
                ListEmptyComponent={<Text style={styles.emptyText}>No Vehicles Found</Text>} 
                contentContainerStyle={styles.tableListContent} 
              />
            </View>
        </View>
      </>
    );
  };

  const renderTableItem = ({ item }) => {
    const isSelected = selectedVehicleId === item.vehicleid;
    const lat = item.latitude || item.lat;
    const lng = item.longitude || item.lng;
    return (
      <TouchableOpacity style={[styles.tableRow, isSelected && styles.tableRowSelected]} onPress={() => handleSelectVehicle(item)}>
        <View style={styles.tableCellMain}>
          <Text style={[styles.tableCellTitle, styles.textDark]} numberOfLines={1}>{item.alias || item.vehicleid}</Text>
          <Text style={styles.tableCellSub}>ID: {item.vehicleid}</Text>
        </View>
        <View style={styles.tableCellData}>
            <Text style={styles.coordsText}>{lat ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : 'No GPS'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#2563EB" /><Text style={[styles.loadingText, styles.textDark]}>Loading Map Data...</Text></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.floatingHeader}>
        <TouchableOpacity onPress={() => setIsSidebarOpen(true)} style={styles.hamburgerBtn}>
            <Text style={styles.hamburgerIcon}>☰</Text>
        </TouchableOpacity>
        
        <View>
            <Text style={[styles.headerTitle, styles.textDark]}>Development</Text>
            <Text style={styles.headerSub}>{userName}</Text>
        </View>
        <View style={{ width: 36 }} /> 
      </View>

      {renderContent()}

      <Sidebar 
        visible={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeMenu={activeMenu}
        onMenuSelect={(id) => setActiveMenu(id)}
        onLogout={handleLogout} 
      />
    </View>
  );
};


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  textDark: { color: '#111827' },
  
  floatingHeader: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 2, paddingHorizontal: 15, paddingBottom: 2,
    backgroundColor: '#FFFFFF', 
    borderBottomWidth: 1, 
    borderBottomColor: '#E5E7EB',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  headerSub: { color: '#6B7280', fontSize: 11, marginTop: 2 },
  hamburgerBtn: { padding: 5 },
  hamburgerIcon: { color: '#111827', fontSize: 22, fontWeight: 'bold' },
  
  searchOverlay: { 
    position: 'absolute', top: 80, left: 10, right: 10, zIndex: 100, 
    backgroundColor: '#FFFFFF', borderRadius: 10, paddingLeft: 15, height: 45, 
    justifyContent: 'center', 
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  searchInput: { color: '#111827', fontSize: 14 },
  searchInputInline: {
    marginTop: 5,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 35,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  
  mainContent: { flex: 1, flexDirection: 'column', marginTop: 150 },
  mainContentLandscape: { flexDirection: 'row', marginTop: 40 }, 
  
  mapContainer: { flex: 0.7, backgroundColor: '#E5E7EB' },
  mapContainerLandscape: { flex: 0.65 },
  map: { width: '100%', height: '100%' },
  mapLoading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },
  
  tableContainer: { flex: 0.3, backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
  tableContainerLandscape: { flex: 0.35, borderTopLeftRadius: 0, borderTopRightRadius: 0, borderLeftWidth: 1, borderLeftColor: '#E5E7EB' },
  
  tableHeader: { padding: 10, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  tableHeaderText: { color: '#6B7280', fontWeight: 'bold', fontSize: 12 },
  tableListContent: { paddingVertical: 5, paddingBottom: 20 },
  tableRow: { 
    flexDirection: 'row', alignItems: 'center', padding: 12, 
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6', 
    justifyContent: 'space-between', 
    marginHorizontal: 5,
    borderRadius: 8,
    marginBottom: 5,
    backgroundColor: '#FFFFFF'
  },
  tableRowSelected: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE' },
  tableCellMain: { flex: 1, marginRight: 5 },
  tableCellTitle: { fontSize: 13, fontWeight: '600' },
  tableCellSub: { color: '#6B7280', fontSize: 11, marginTop: 1 },
  tableCellData: { alignItems: 'flex-end', marginRight: 5 },
  coordsText: { color: '#6B7280', fontSize: 10 },

  placeholderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 130, backgroundColor: '#F3F4F6' },
  placeholderIcon: { fontSize: 60, marginBottom: 20 },
  placeholderText: { fontSize: 20, fontWeight: 'bold' },
  placeholderSub: { color: '#6B7280', marginTop: 10 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },
  loadingText: { marginTop: 10 },
  emptyText: { color: '#9CA3AF', textAlign: 'center', marginTop: 20, fontSize: 12 },
});

export default HomeScreen;