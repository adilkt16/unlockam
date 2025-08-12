package com.unlockam.mobile.devbuild.alarmmodule

import android.app.Activity
import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.util.Log
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.TextView
import com.unlockam.mobile.devbuild.R
import java.text.SimpleDateFormat
import java.util.*
import kotlin.random.Random

/**
 * Alarmy-style alarm activity that displays over lock screen with puzzle challenge
 * Uses all necessary flags and mechanisms to ensure it shows regardless of device state
 */
class AlarmyStyleAlarmActivity : Activity() {
    
    private val tag = "AlarmyStyleActivity"
    
    // Current alarm information
    private var alarmId: Int = -1
    private var alarmLabel: String = ""
    private var triggerTime: Long = 0L
    
    // Screen wake lock
    private var screenWakeLock: PowerManager.WakeLock? = null
    
    // Puzzle state
    private var mathProblem: MathProblem? = null
    
    // UI components
    private lateinit var timeTextView: TextView
    private lateinit var labelTextView: TextView
    private lateinit var puzzleTextView: TextView
    private lateinit var answerButtons: List<Button>
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Log.d(tag, "AlarmyStyleAlarmActivity created")
        
        // Extract alarm data from intent
        extractAlarmData()
        
        // Setup window flags for lock screen display (Alarmy's approach)
        setupLockScreenDisplay()
        
        // Acquire screen wake lock
        acquireScreenWakeLock()
        
        // Set content view
        setContentView(R.layout.activity_alarmy_alarm)
        
        // Initialize UI components
        initializeUI()
        
        // Generate and display puzzle
        generatePuzzle()
    }
    
    override fun onDestroy() {
        Log.d(tag, "AlarmyStyleAlarmActivity destroyed")
        releaseScreenWakeLock()
        super.onDestroy()
    }
    
    override fun onBackPressed() {
        // Disable back button - user must solve puzzle (Alarmy's approach)
        Log.d(tag, "Back button pressed - ignoring (puzzle must be solved)")
    }
    
    /**
     * Extract alarm data from intent
     */
    private fun extractAlarmData() {
        alarmId = intent.getIntExtra("alarm_id", -1)
        alarmLabel = intent.getStringExtra("alarm_label") ?: "Wake up!"
        triggerTime = intent.getLongExtra("trigger_time", System.currentTimeMillis())
        
        Log.d(tag, "Alarm data - ID: $alarmId, Label: $alarmLabel, Time: $triggerTime")
    }
    
    /**
     * Setup window flags for lock screen display (critical for Alarmy behavior)
     */
    private fun setupLockScreenDisplay() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            // Android 8.1+ approach
            setShowWhenLocked(true)
            setTurnScreenOn(true)
            
            val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
            keyguardManager.requestDismissKeyguard(this, null)
        }
        
        // Universal approach - set window flags
        window.apply {
            addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            addFlags(WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD)
            addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED)
            addFlags(WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON)
            addFlags(WindowManager.LayoutParams.FLAG_ALLOW_LOCK_WHILE_SCREEN_ON)
            
            // Make fullscreen
            addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN)
            
            // Highest priority
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS)
                statusBarColor = resources.getColor(R.color.alarm_background, null)
            }
        }
        
        Log.d(tag, "Lock screen display flags configured")
    }
    
    /**
     * Acquire screen wake lock to keep display on
     */
    private fun acquireScreenWakeLock() {
        try {
            val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
            screenWakeLock = powerManager.newWakeLock(
                PowerManager.SCREEN_BRIGHT_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP,
                "UnlockAM:AlarmScreenWakeLock"
            )
            screenWakeLock?.acquire(10 * 60 * 1000L) // 10 minutes max
            Log.d(tag, "Screen wake lock acquired")
        } catch (e: Exception) {
            Log.e(tag, "Failed to acquire screen wake lock", e)
        }
    }
    
    /**
     * Release screen wake lock
     */
    private fun releaseScreenWakeLock() {
        try {
            screenWakeLock?.let {
                if (it.isHeld) {
                    it.release()
                }
            }
            screenWakeLock = null
            Log.d(tag, "Screen wake lock released")
        } catch (e: Exception) {
            Log.e(tag, "Error releasing screen wake lock", e)
        }
    }
    
    /**
     * Initialize UI components
     */
    private fun initializeUI() {
        timeTextView = findViewById(R.id.alarm_time)
        labelTextView = findViewById(R.id.alarm_label)
        puzzleTextView = findViewById(R.id.puzzle_question)
        
        answerButtons = listOf(
            findViewById(R.id.answer_button_1),
            findViewById(R.id.answer_button_2),
            findViewById(R.id.answer_button_3),
            findViewById(R.id.answer_button_4)
        )
        
        // Set alarm info
        val timeFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
        timeTextView.text = timeFormat.format(Date(triggerTime))
        labelTextView.text = alarmLabel
        
        Log.d(tag, "UI components initialized")
    }
    
    /**
     * Generate math puzzle (Alarmy-style challenge)
     */
    private fun generatePuzzle() {
        mathProblem = MathProblem.generate()
        
        puzzleTextView.text = "Solve to dismiss alarm:\n${mathProblem?.question}"
        
        // Generate answer options (correct answer + 3 wrong ones)
        val correctAnswer = mathProblem?.answer ?: 0
        val wrongAnswers = mutableSetOf<Int>()
        
        // Generate 3 unique wrong answers
        while (wrongAnswers.size < 3) {
            val offset = Random.nextInt(-10, 11)
            if (offset != 0) {
                wrongAnswers.add(correctAnswer + offset)
            }
        }
        
        val allAnswers = (wrongAnswers + correctAnswer).shuffled()
        
        // Set button texts and click listeners
        answerButtons.forEachIndexed { index, button ->
            val answer = allAnswers[index]
            button.text = answer.toString()
            button.setOnClickListener {
                handleAnswerClick(answer, correctAnswer)
            }
        }
        
        Log.d(tag, "Puzzle generated: ${mathProblem?.question} = $correctAnswer")
    }
    
    /**
     * Handle answer button click
     */
    private fun handleAnswerClick(selectedAnswer: Int, correctAnswer: Int) {
        if (selectedAnswer == correctAnswer) {
            Log.i(tag, "Correct answer! Dismissing alarm.")
            dismissAlarm()
        } else {
            Log.d(tag, "Wrong answer. Generating new puzzle.")
            // Generate new puzzle for wrong answer (makes it harder to guess)
            generatePuzzle()
        }
    }
    
    /**
     * Dismiss the alarm completely
     */
    private fun dismissAlarm() {
        Log.i(tag, "Dismissing alarm ID: $alarmId")
        
        // Stop the alarm service
        val serviceIntent = Intent(this, AlarmyStyleAlarmService::class.java).apply {
            action = "STOP_ALARM"
        }
        startService(serviceIntent)
        
        // Remove any overlay
        AlarmyStyleOverlayManager.hideAlarmOverlay()
        
        // Finish activity
        finish()
    }
    
    /**
     * Data class for math problems
     */
    private data class MathProblem(
        val question: String,
        val answer: Int
    ) {
        companion object {
            fun generate(): MathProblem {
                val operations = listOf("+", "-", "×")
                val operation = operations.random()
                
                return when (operation) {
                    "+" -> {
                        val a = Random.nextInt(10, 50)
                        val b = Random.nextInt(10, 50)
                        MathProblem("$a + $b", a + b)
                    }
                    "-" -> {
                        val a = Random.nextInt(30, 100)
                        val b = Random.nextInt(10, a)
                        MathProblem("$a - $b", a - b)
                    }
                    "×" -> {
                        val a = Random.nextInt(2, 12)
                        val b = Random.nextInt(2, 12)
                        MathProblem("$a × $b", a * b)
                    }
                    else -> MathProblem("2 + 2", 4)
                }
            }
        }
    }
}
