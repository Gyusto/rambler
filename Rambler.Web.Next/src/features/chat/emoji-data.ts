export interface EmojiCategory {
  id: string;
  label: string;
  icon: string; // Font Awesome
  emojis: string[];
}

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: "smileys",
    label: "Smileys",
    icon: "fa-face-smile",
    emojis: "😀 😃 😄 😁 😆 😅 😂 🤣 🥲 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🥸 🤩 🥳 😏 😒 😞 😔 😟 😕 🙁 ☹️ 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤗 🤔 🤭 🤫 🤥 😶 😐 😑 😬 🙄 😯 😦 😧 😮 😲 🥱 😴 🤤 😪 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕".split(" "),
  },
  {
    id: "gestures",
    label: "Gestures",
    icon: "fa-hand",
    emojis: "👍 👎 👌 🤌 🤏 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ 👋 🤚 🖐️ ✋ 🖖 👏 🙌 🤝 🙏 ✍️ 💪 👀 👁️ 👅 👄 🫶 🤲 🫰 🫵 🤳 💅".split(" "),
  },
  {
    id: "animals",
    label: "Animals",
    icon: "fa-paw",
    emojis: "🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐔 🐧 🐦 🐤 🦆 🦅 🦉 🐺 🐗 🐴 🦄 🐝 🐛 🦋 🐌 🐞 🐜 🕷️ 🐢 🐍 🦎 🐙 🦑 🦐 🦀 🐡 🐠 🐟 🐬 🐳 🐋 🦈 🐊 🐅 🐆 🦓 🦍 🐘 🐪 🐫 🦒 🐄 🐎 🐖 🐑 🐐 🦌 🐕 🐈 🐓 🦃 🕊️ 🐇 🐁 🐀 🐿️".split(" "),
  },
  {
    id: "food",
    label: "Food",
    icon: "fa-utensils",
    emojis: "🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🍆 🥑 🥦 🥬 🥒 🌶️ 🌽 🥕 🧄 🧅 🥔 🍠 🥐 🍞 🥖 🥨 🧀 🥚 🍳 🧇 🥞 🥓 🍔 🍟 🍕 🌭 🥪 🌮 🌯 🥗 🍿 🍦 🍩 🍪 🎂 🍰 🧁 🥧 🍫 🍬 🍭 🍮 🍯 🍺 🍻 🥂 🍷 🥃 🍸 🍹 ☕ 🍵 🧃 🥤".split(" "),
  },
  {
    id: "activities",
    label: "Activities",
    icon: "fa-futbol",
    emojis: "⚽ 🏀 🏈 ⚾ 🥎 🎾 🏐 🏉 🥏 🎱 🏓 🏸 🏒 🏑 🏏 ⛳ 🏹 🎣 🥊 🥋 ⛸️ 🎿 ⛷️ 🏂 🏋️ 🤼 🤸 ⛹️ 🏌️ 🏇 🧘 🏄 🏊 🚣 🧗 🚴 🚵 🎯 🎮 🕹️ 🎲 🎰 🎳 🎤 🎧 🎸 🎹 🥁 🎺 🎷 🎻".split(" "),
  },
  {
    id: "travel",
    label: "Travel",
    icon: "fa-plane",
    emojis: "🚗 🚕 🚙 🚌 🏎️ 🚓 🚑 🚒 🚐 🚚 🚜 🛴 🚲 🛵 🏍️ 🚨 🚁 ✈️ 🛫 🛬 🚀 🛸 ⛵ 🚤 🚢 ⚓ 🗺️ 🗿 🗽 🗼 🏰 🏯 🎡 🎢 🎠 ⛲ 🏖️ 🏝️ 🏔️ 🌋 🏕️ ⛺ 🏠 🏡 🏢 🏬 🏥 🏦 🏨 🏫".split(" "),
  },
  {
    id: "objects",
    label: "Objects",
    icon: "fa-lightbulb",
    emojis: "⌚ 📱 💻 ⌨️ 🖥️ 🖨️ 🖱️ 💾 💿 📷 📹 🎥 📞 ☎️ 📺 📻 🎙️ ⏰ 💡 🔦 🕯️ 🔋 🔌 🔍 🔒 🔓 🔑 🔨 🪓 🔧 🔩 ⚙️ 🧲 🔫 💣 🔪 💊 💉 🩹 🌡️ 🧹 🧺 🧻 🚿 🛁 🧼 🧯 🛒 🎁 🎈 🎉 🎊 🎀 📦 ✏️ 🖊️ 📝 💼 📁 📅 📌 📎 📏 📐 ✂️".split(" "),
  },
  {
    id: "symbols",
    label: "Hearts",
    icon: "fa-heart",
    emojis: "❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ☮️ ☯️ ⛎ ♈ ♉ ♊ ♋ ♌ ♍ ♎ ♏ ♐ ♑ ♒ ♓ ⚛️ ✅ ❎ 💯 🔥 ⭐ 🌟 ✨ ⚡ ☄️ 💥 🔴 🟠 🟡 🟢 🔵 🟣 ⚫ ⚪ 🟤".split(" "),
  },
];
