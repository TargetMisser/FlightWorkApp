## 2024-05-14 - Optimize FlightScreen FlatList
**Learning:** FlightScreen FlatList rendered hundreds of flights simultaneously when filtering 'all', leading to heavy memory use and poor rendering performance on Android.
**Action:** Adding windowing properties (`initialNumToRender`, `windowSize`, `maxToRenderPerBatch`, `removeClippedSubviews`) to FlatLists rendering dynamic remote data is essential for maintaining smooth 60fps scrolling and fast initial render on lower-end devices.
