import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; 

const { width } = Dimensions.get('window');

const Sidebar = ({ visible, onClose, activeMenu, onMenuSelect, onLogout }) => {
  
  const slideAnim = React.useRef(new Animated.Value(-width * 0.75)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -width * 0.75,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!visible) return null;

  const renderMenuItem = (id, label, iconName, isLogout = false) => {
    const isActive = activeMenu === id;
    // Warna untuk Light Theme
    const color = isLogout ? '#DC2626' : (isActive ? '#2563EB' : '#374151');
    const bgColor = isActive && !isLogout ? '#EFF6FF' : 'transparent';

    return (
      <TouchableOpacity
        key={id}
        style={[styles.menuItem, { backgroundColor: bgColor }]}
        onPress={() => {
          if (isLogout) {
            onLogout();
          } else {
            onMenuSelect(id);
          }
          onClose();
        }}
      >
        <Ionicons name={iconName} size={22} color={color} style={styles.menuIcon} />
        <Text style={[styles.menuLabel, { color: color, fontWeight: isLogout ? 'bold' : (isActive ? '600' : '500') }]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.overlay}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.sidebarContainer, { transform: [{ translateX: slideAnim }] }]}>
        <View style={styles.headerSidebar}>
          <Text style={styles.appName}>Development</Text>
          <Text style={styles.appSub}>Version 1.0.0</Text>
        </View>

        <View style={styles.menuList}>
         {renderMenuItem('dashboard', 'Home Page', 'home-outline')}
         {renderMenuItem('dailyReport', 'Daily Report', 'calendar-outline')}
         {renderMenuItem('interventionReport', 'Intervention Report', 'document-text-outline')}
         {renderMenuItem('dmsAnalytic', 'DMS Analytic', 'analytics-outline')}
         {renderMenuItem('feature', 'Feature', 'grid-outline')}
        <View style={styles.separator} />
         {renderMenuItem('logout', 'Keluar', 'log-out-outline', true)}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    flexDirection: 'row',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)', // Sedikit lebih gelap untuk kontras
  },
  sidebarContainer: {
    width: width * 0.75,
    height: '100%',
    backgroundColor: '#FFFFFF', // Putih
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 20,
  },
  headerSidebar: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 10,
  },
  appName: {
    color: '#111827', // Hitam
    fontSize: 20,
    fontWeight: 'bold',
  },
  appSub: {
    color: '#6B7280', // Abu-abu
    fontSize: 12,
    marginTop: 4,
  },
  menuList: {
    paddingHorizontal: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    marginBottom: 5,
  },
  menuIcon: {
    marginRight: 15,
  },
  menuLabel: {
    fontSize: 15,
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 15,
    marginHorizontal: 10,
  }
});

export default Sidebar;