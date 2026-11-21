import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable,
  SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@daily_expense_tracker/expenses_v1';
const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Health', 'Education', 'Entertainment', 'Other'];
const COLORS = ['#2563EB', '#0D9488', '#D97706', '#7C3AED', '#DB2777', '#64748B', '#16A34A', '#EA580C'];

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const money = (value) => `₦${Number(value || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
const prettyDate = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function App() {
  const [expenses, setExpenses] = useState([]);
  const [ready, setReady] = useState(false);
  const [activeTab, setActiveTab] = useState('Today');
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayISO());
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) setExpenses(JSON.parse(saved));
      } catch {
        Alert.alert('Storage issue', 'Your saved expenses could not be loaded.');
      } finally { setReady(true); }
    })();
  }, []);

  useEffect(() => {
    if (ready) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(expenses)).catch(() =>
      Alert.alert('Storage issue', 'Your changes could not be saved on this device.')
    );
  }, [expenses, ready]);

  const today = todayISO();
  const todayExpenses = useMemo(() => expenses.filter(e => e.date === today), [expenses, today]);
  const todayTotal = todayExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const monthPrefix = today.slice(0, 7);
  const monthExpenses = expenses.filter(e => e.date.startsWith(monthPrefix));
  const monthTotal = monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const shownExpenses = useMemo(() => {
    let list = activeTab === 'Today' ? todayExpenses : activeTab === 'History' ? expenses : monthExpenses;
    if (activeTab === 'History' && search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e => `${e.note} ${e.category} ${e.date}`.toLowerCase().includes(q));
    }
    return [...list].sort((a,b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  }, [activeTab, todayExpenses, expenses, monthExpenses, search]);

  const openAdd = () => {
    setEditing(null); setAmount(''); setCategory('Food'); setNote(''); setDate(today); setModalVisible(true);
  };
  const openEdit = (item) => {
    setEditing(item); setAmount(String(item.amount)); setCategory(item.category);
    setNote(item.note || ''); setDate(item.date); setModalVisible(true);
  };
  const saveExpense = () => {
    const numericAmount = Number(amount.replace(/,/g, '').trim());
    if (!amount.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      Alert.alert('Enter an amount', 'Please enter an amount greater than zero.'); return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T00:00:00`).getTime())) {
      Alert.alert('Check the date', 'Use the date format YYYY-MM-DD.'); return;
    }
    if (editing) {
      setExpenses(prev => prev.map(e => e.id === editing.id
        ? { ...e, amount: numericAmount, category, note: note.trim(), date } : e));
    } else {
      setExpenses(prev => [{ id: `${Date.now()}-${Math.random()}`, amount: numericAmount,
        category, note: note.trim(), date, createdAt: Date.now() }, ...prev]);
    }
    setModalVisible(false);
  };
  const deleteExpense = (item) => Alert.alert('Delete expense?', 'This expense will be removed from this device.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => setExpenses(prev => prev.filter(e => e.id !== item.id)) }
  ]);

  const categoryTotals = CATEGORIES.map((name, i) => ({
    name, color: COLORS[i], total: monthExpenses.filter(e => e.category === name).reduce((s,e) => s + Number(e.amount), 0)
  })).filter(x => x.total > 0).sort((a,b) => b.total - a.total);

  const renderExpense = ({ item }) => {
    const idx = CATEGORIES.indexOf(item.category);
    return (
      <Pressable style={styles.expenseCard} onPress={() => openEdit(item)} onLongPress={() => deleteExpense(item)}>
        <View style={[styles.categoryDot, { backgroundColor: COLORS[Math.max(idx,0)] }]} />
        <View style={styles.expenseInfo}>
          <Text style={styles.expenseCategory}>{item.category}</Text>
          <Text style={styles.expenseNote} numberOfLines={1}>{item.note || 'No description'}</Text>
          {activeTab !== 'Today' && <Text style={styles.expenseDate}>{prettyDate(item.date)}</Text>}
        </View>
        <Text style={styles.expenseAmount}>{money(item.amount)}</Text>
      </Pressable>
    );
  };

  if (!ready) return <SafeAreaView style={styles.loading}><StatusBar barStyle="dark-content" /><Text style={styles.loadingText}>Loading your expenses…</Text></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FB" />
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>YOUR MONEY, IN VIEW</Text>
          <Text style={styles.title}>Daily Expenses</Text>
        </View>
        <View style={styles.avatar}><Text style={styles.avatarText}>₦</Text></View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>SPENT TODAY</Text>
          <Text style={styles.todayAmount}>{money(todayTotal)}</Text>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryBottom}>
            <View><Text style={styles.smallLabel}>This month</Text><Text style={styles.summaryValue}>{money(monthTotal)}</Text></View>
            <View style={styles.summaryRight}><Text style={styles.smallLabel}>Transactions today</Text><Text style={styles.summaryValue}>{todayExpenses.length}</Text></View>
          </View>
          <View style={styles.decorCircle} />
        </View>

        <View style={styles.tabs}>
          {['Today', 'This Month', 'History'].map(tab => (
            <Pressable key={tab} onPress={() => setActiveTab(tab)}
              style={[styles.tab, activeTab === tab && styles.activeTab]}>
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
            </Pressable>
          ))}
        </View>

        {activeTab === 'History' && <TextInput style={styles.search} placeholder="Search expenses…" value={search} onChangeText={setSearch} />}
        {activeTab === 'This Month' && (
          <View style={styles.breakdown}>
            <Text style={styles.sectionTitle}>Spending by category</Text>
            {categoryTotals.length === 0 ? <Text style={styles.muted}>No spending recorded this month yet.</Text> :
              categoryTotals.map(item => (
                <View key={item.name} style={styles.categoryRow}>
                  <View style={styles.categoryTop}><View style={styles.categoryNameWrap}><View style={[styles.categoryDot,{backgroundColor:item.color}]} /><Text style={styles.categoryName}>{item.name}</Text></View><Text style={styles.categoryAmount}>{money(item.total)}</Text></View>
                  <View style={styles.track}><View style={[styles.fill,{width:`${monthTotal ? item.total/monthTotal*100 : 0}%`,backgroundColor:item.color}]} /></View>
                </View>
              ))}
          </View>
        )}

        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>{activeTab === 'Today' ? "Today's transactions" : activeTab === 'This Month' ? 'This month' : 'All transactions'}</Text>
          <Text style={styles.count}>{shownExpenses.length} {shownExpenses.length === 1 ? 'item' : 'items'}</Text>
        </View>
        {shownExpenses.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>＋</Text>
            <Text style={styles.emptyTitle}>Nothing to show yet</Text>
            <Text style={styles.emptyText}>Add an expense to start keeping track of your spending.</Text>
            <Pressable style={styles.emptyButton} onPress={openAdd}><Text style={styles.emptyButtonText}>Add an expense</Text></Pressable>
          </View>
        ) : <FlatList data={shownExpenses} keyExtractor={item => item.id} renderItem={renderExpense} scrollEnabled={false} />}
        <Text style={styles.hint}>Tap an expense to edit it · Press and hold to delete</Text>
      </ScrollView>

      <Pressable style={styles.fab} onPress={openAdd}><Text style={styles.fabPlus}>＋</Text><Text style={styles.fabText}>Add expense</Text></Pressable>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>{editing ? 'Edit expense' : 'New expense'}</Text><Pressable onPress={() => setModalVisible(false)}><Text style={styles.close}>✕</Text></Pressable></View>
            <Text style={styles.fieldLabel}>AMOUNT (₦)</Text>
            <TextInput style={styles.amountInput} value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" autoFocus />
            <Text style={styles.fieldLabel}>CATEGORY</Text>
            <View style={styles.categoryChoices}>{CATEGORIES.map((c,i) => (
              <Pressable key={c} onPress={() => setCategory(c)} style={[styles.choice, category === c && {backgroundColor:COLORS[i],borderColor:COLORS[i]}]}>
                <Text style={[styles.choiceText, category === c && styles.choiceTextActive]}>{c}</Text>
              </Pressable>
            ))}</View>
            <Text style={styles.fieldLabel}>DESCRIPTION (OPTIONAL)</Text>
            <TextInput style={styles.textInput} value={note} onChangeText={setNote} placeholder="What did you spend on?" maxLength={80} />
            <Text style={styles.fieldLabel}>DATE (YYYY-MM-DD)</Text>
            <TextInput style={styles.textInput} value={date} onChangeText={setDate} placeholder="2026-11-20" />
            <Pressable style={styles.saveButton} onPress={saveExpense}><Text style={styles.saveButtonText}>{editing ? 'Save changes' : 'Save expense'}</Text></Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:'#F5F7FB'}, loading:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:'#F5F7FB'},loadingText:{color:'#64748B',fontSize:15},
  header:{paddingHorizontal:22,paddingTop:16,paddingBottom:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  eyebrow:{fontSize:10,fontWeight:'800',letterSpacing:1.8,color:'#64748B',marginBottom:5},title:{fontSize:27,fontWeight:'800',color:'#14213D'},
  avatar:{width:42,height:42,borderRadius:15,backgroundColor:'#E4ECFF',alignItems:'center',justifyContent:'center'},avatarText:{fontSize:22,fontWeight:'800',color:'#2457C5'},
  content:{paddingHorizontal:18,paddingBottom:110},
  summaryCard:{backgroundColor:'#173B75',borderRadius:24,padding:22,overflow:'hidden',marginBottom:22},
  summaryLabel:{fontSize:11,color:'#C7D7F4',fontWeight:'800',letterSpacing:1.5},todayAmount:{fontSize:36,fontWeight:'800',color:'#FFFFFF',marginTop:7,marginBottom:20},
  summaryDivider:{height:1,backgroundColor:'rgba(255,255,255,0.2)',marginBottom:15},summaryBottom:{flexDirection:'row',justifyContent:'space-between'},
  smallLabel:{fontSize:11,color:'#C7D7F4',marginBottom:5},summaryValue:{fontSize:17,fontWeight:'700',color:'#FFFFFF'},summaryRight:{alignItems:'flex-end'},
  decorCircle:{position:'absolute',width:170,height:170,borderRadius:85,backgroundColor:'rgba(255,255,255,0.045)',right:-55,top:-75},
  tabs:{flexDirection:'row',backgroundColor:'#E9EDF5',borderRadius:14,padding:4,marginBottom:20},tab:{flex:1,paddingVertical:11,alignItems:'center',borderRadius:11},activeTab:{backgroundColor:'#FFFFFF',elevation:2},tabText:{fontSize:12,fontWeight:'700',color:'#718096'},activeTabText:{color:'#173B75'},
  sectionTitle:{fontSize:16,fontWeight:'800',color:'#182641'},listHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12,marginTop:4},count:{fontSize:12,color:'#8490A3'},
  expenseCard:{backgroundColor:'#FFFFFF',borderRadius:16,padding:15,marginBottom:10,flexDirection:'row',alignItems:'center',borderWidth:1,borderColor:'#EDF0F5'},
  categoryDot:{width:10,height:10,borderRadius:5,marginRight:11},expenseInfo:{flex:1},expenseCategory:{fontSize:14,fontWeight:'800',color:'#24324B'},expenseNote:{fontSize:12,color:'#8993A4',marginTop:3},expenseDate:{fontSize:10,color:'#A0A8B6',marginTop:3},expenseAmount:{fontSize:14,fontWeight:'800',color:'#24324B'},
  empty:{backgroundColor:'#FFFFFF',borderRadius:18,padding:25,alignItems:'center',marginTop:4},emptyIcon:{width:48,height:48,lineHeight:48,textAlign:'center',borderRadius:24,backgroundColor:'#EDF3FF',color:'#2457C5',fontSize:26,overflow:'hidden'},emptyTitle:{fontSize:15,fontWeight:'800',color:'#24324B',marginTop:12},emptyText:{fontSize:12,color:'#8993A4',textAlign:'center',lineHeight:19,marginTop:5,maxWidth:240},emptyButton:{backgroundColor:'#2457C5',paddingHorizontal:18,paddingVertical:11,borderRadius:11,marginTop:15},emptyButtonText:{color:'#FFFFFF',fontSize:12,fontWeight:'800'},
  hint:{textAlign:'center',fontSize:10,color:'#A0A8B6',marginTop:12,marginBottom:12},fab:{position:'absolute',bottom:22,alignSelf:'center',backgroundColor:'#2457C5',paddingHorizontal:22,paddingVertical:14,borderRadius:30,flexDirection:'row',alignItems:'center',elevation:5},fabPlus:{fontSize:20,color:'#FFFFFF',marginRight:7,fontWeight:'500'},fabText:{fontSize:13,color:'#FFFFFF',fontWeight:'800'},
  breakdown:{backgroundColor:'#FFFFFF',padding:17,borderRadius:17,marginBottom:20,borderWidth:1,borderColor:'#EDF0F5'},categoryRow:{marginTop:15},categoryTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:8},categoryNameWrap:{flexDirection:'row',alignItems:'center'},categoryName:{fontSize:12,color:'#526078',fontWeight:'600'},categoryAmount:{fontSize:12,color:'#24324B',fontWeight:'700'},track:{height:6,backgroundColor:'#EEF1F6',borderRadius:5,overflow:'hidden'},fill:{height:6,borderRadius:5},muted:{fontSize:12,color:'#8993A4',marginTop:12},
  search:{backgroundColor:'#FFFFFF',borderRadius:12,paddingHorizontal:15,paddingVertical:12,fontSize:13,marginBottom:16,borderWidth:1,borderColor:'#E9EDF3'},
  modalOverlay:{flex:1,backgroundColor:'rgba(13,24,43,0.48)',justifyContent:'flex-end'},modalSheet:{backgroundColor:'#FFFFFF',borderTopLeftRadius:25,borderTopRightRadius:25,paddingHorizontal:22,paddingTop:12,paddingBottom:Platform.OS==='ios'?30:22,maxHeight:'92%'},
  modalHandle:{width:40,height:4,borderRadius:3,backgroundColor:'#D8DEE8',alignSelf:'center',marginBottom:18},modalHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:20},modalTitle:{fontSize:20,fontWeight:'800',color:'#182641'},close:{fontSize:20,color:'#8993A4',padding:4},
  fieldLabel:{fontSize:10,fontWeight:'800',letterSpacing:1.1,color:'#7A879B',marginBottom:8,marginTop:13},amountInput:{fontSize:30,fontWeight:'800',color:'#173B75',borderBottomWidth:1,borderBottomColor:'#E8ECF2',paddingVertical:8},
  categoryChoices:{flexDirection:'row',flexWrap:'wrap',gap:8},choice:{borderWidth:1,borderColor:'#E4E9F1',borderRadius:20,paddingHorizontal:12,paddingVertical:8,backgroundColor:'#FFFFFF'},choiceText:{fontSize:11,color:'#59677D',fontWeight:'700'},choiceTextActive:{color:'#FFFFFF'},
  textInput:{borderWidth:1,borderColor:'#E5EAF1',borderRadius:12,paddingHorizontal:13,paddingVertical:12,fontSize:13,color:'#24324B'},saveButton:{backgroundColor:'#2457C5',padding:16,borderRadius:13,alignItems:'center',marginTop:22},saveButtonText:{color:'#FFFFFF',fontSize:14,fontWeight:'800'}
});
