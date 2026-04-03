package com.anonymous.flightworkapp.wear.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material3.Text
import com.anonymous.flightworkapp.wear.theme.WearColors

@Composable
fun EmptyState() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(WearColors.background),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text("✈️", fontSize = 36.sp)
            Spacer(Modifier.height(8.dp))
            Text(
                "Nessun volo",
                color = WearColors.textSecondary,
                fontSize = 14.sp,
                fontWeight = androidx.compose.ui.text.font.FontWeight.SemiBold
            )
            Spacer(Modifier.height(4.dp))
            Text(
                "Pinna un volo dall'app",
                color = WearColors.textMuted,
                fontSize = 11.sp,
                textAlign = TextAlign.Center
            )
        }
    }
}
