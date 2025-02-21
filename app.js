const PATH = "http://localhost:3000/api/v1/"
const NOTES = {"red": "c4", "yellow": "d4", "green": "e4", "blue": "f4"}
const keymap = {"q": "pad-red", "w": "pad-yellow", "a": "pad-green", "s": "pad-blue"}

// empty gamestate in case of no backend
let GAMESTATE = {highScore: 0, level: 1, sequence: []}
let USER_INPUT = []
let PADS = []
let seq = []
console.log("javascript")

document.addEventListener("DOMContentLoaded", async function() {
    try {
        let response = await fetch(PATH+"game-state", {method: "PUT"})
        response = await response.json()
        GAMESTATE = response.gameState
    } catch (error) {
        // remove start button onclick if no backend
        document.getElementById("start-btn").removeAttribute("onclick")
        console.log(error)
    }
    restart()

    // key presses act as onclicks
    document.onkeydown = function (k) {
        if (k.key in keymap) {
            e = document.getElementById(keymap[k.key]).click()
        }
    }

    // adding onclicks to game pads
    PADS = document.getElementsByClassName("pad")
    Array.from(PADS).forEach((pad) => {
        pad.disabled = true
        pad.addEventListener("click", () => {
            color = pad.id.split("-")[1]
            USER_INPUT.push(color)
            play_sound(color)
        })
    })
})

const play_sequence = async (seq) => {
    // reset user clicked pads for when user replays sequence
    USER_INPUT = []

    // disable pads while sequence is played
    Array.from(PADS).forEach((pad) => {pad.disabled = true})
    seq.forEach((s, i) => {
        play_sound(s, i*0.5)
    })

    // enable pads back after sequence is played
    setTimeout(() => {
        Array.from(PADS).forEach((pad) => {pad.disabled = false})
    }, seq.length*500);
}

const play_sound = async (color, delay = 0) => {
    let wave = document.getElementById("sound-select").value
    const now = Tone.now();
    const SYNTH = new Tone.Synth({
        oscillator: {
            type: wave
        }
    }).toDestination();

    // inner timeout to delay pads going back to normal
    // outer timeout to delay pads going to 'pad-active' synced with sound delay
    setTimeout(() => {
        document.getElementById(`pad-${color}`).classList.add("pad-active")
        SYNTH.triggerAttackRelease(NOTES[color], "16n", now + delay);
        setTimeout(() => {
            document.getElementById(`pad-${color}`).classList.remove("pad-active")
        }, 300)
    }, 1000*delay)
}

const game = async () => {
    let playing = true
    document.getElementById("start-btn").disabled = true
    document.getElementById("replay-btn").disabled = false
    while (playing === true) {
        seq = GAMESTATE.sequence
        play_sequence(seq)
        
        // wait for user to press as many pads as the sequence is long
        await user_input()
        
        // disable pads
        Array.from(PADS).forEach((pad) => {pad.disabled = true})
        let ok = false
        try {
            let res = await fetch(PATH+"game-state/sequence", {method: "POST", headers:{"Content-Type": "application/json"}, body:JSON.stringify({"sequence": USER_INPUT})})
            ok = res.ok
            res = await res.json()
            GAMESTATE = res.gameState
        } catch (error) {
            console.log(error)
        }
        console.log(ok)
        document.getElementById("level-indicator").innerHTML = GAMESTATE.level
        if (ok) {
            // timeout to not instantly begin playing next sequence after user input
            await timeout(1500)
        } else {
            // break loop, show error message with "display = 'flex'"
            playing = false
            restart("flex")
        }
    }
}

const user_input = async () => {
    // wait until user has pressed as many pads as sequence is long
    while (USER_INPUT.length < seq.length) {
        await timeout(50)
    }
}

const restart = async (display="none") => {
    document.getElementsByClassName("modal")[0].style.setProperty("display",display)
    document.getElementById("start-btn").disabled = false
    document.getElementById("replay-btn").disabled = true
    document.getElementById("high-score").innerHTML = GAMESTATE.highScore
}

// timeout with no function
const timeout = async (ms) => new Promise((res) => setTimeout(res, ms))
