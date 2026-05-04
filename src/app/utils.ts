// utils.ts
export const getCardIcon = (cardName: string) => {
    switch (cardName) {
      case 'Deep Woods Witch': return '🧙‍♀️';
      case 'Royal Knight': return '🏇';
      case 'Dwarf Swarm': return '⛏️';
      case 'Poison Apple': return '🍎';
      case 'Miner Bomb': return '💣';
      case 'The King': return '👑';
      case 'Snow White': return '👸';
      case 'Tin Woodman': return '🤖';
      case 'Scarecrow': return '🎃';
      case 'Oz Tornado': return '🌪️';
      case 'Dwarf Hut': return '🛖';
      case 'Huntsman': return '🏹';
      case 'Fairy Bluebird': return '🐦';
      case 'Miner Dwarf': return '👷';
      case 'Cowardly Lion': return '🦁';
      case 'Wicked Witch': return '🧹';
      case "Glinda's Light": return '✨';
      default: return '❓';
    }
};

export const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};