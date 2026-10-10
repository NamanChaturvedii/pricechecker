// Default vegetable/fruit list. Editable from the dashboard (saved to data/items.json).
// qty + unit = the exact quantity whose price we report.
// query    = what we type in the site search box
// must     = at least one of these words must be in the product name
// prefer   = words that make a product a better match (e.g. variety names)
// avoid    = words that disqualify a product (processed items, other varieties)
// approxG  = approx grams per piece/bunch, used only when a site sells by a different unit

const PROCESSED = ['chips', 'powder', 'paste', 'pickle', 'sauce', 'ketchup', 'puree', 'juice', 'dried', 'dehydrated', 'frozen', 'chopped', 'peeled', 'diced', 'sliced', 'cut', 'flakes', 'seeds', 'seed', 'masala', 'jam', 'candy', 'oil', 'soap', 'shampoo', 'cream', 'face', 'wash', 'toy', 'pouch', 'combo', 'kit', 'mix', 'sprouts', 'salad', 'snack', 'snacks', 'mathri', 'namkeen', 'bhujia', 'cookies', 'cookie', 'biscuit', 'biscuits', 'noodles', 'soup', 'chutney', 'murabba', 'bar', 'cake', 'bread', 'pakoda', 'rings', 'crisps', 'seasoning', 'spread', 'syrup', 'shake', 'smoothie', 'icecream', 'ice cream', 'pasta', 'sambar', 'rasam', 'curry', 'hair', 'conditioner', 'serum', 'lotion', 'gel', 'rasna', 'tang', 'squash', 'concentrate', 'flavour', 'flavor', 'essence', 'drink', 'tea', 'organically', 'crush', 'fruit plus', 'pulp'];

export const DEFAULT_ITEMS = [
  { id: 'potato', name: 'Potato (chipsona)', qty: 1, unit: 'kg', query: 'potato', must: ['potato', 'aloo'], prefer: ['chipsona'], avoid: [...PROCESSED, 'sweet', 'baby', 'organic'], approxG: 200 },
  { id: 'onion', name: 'Onion', qty: 1, unit: 'kg', query: 'onion', must: ['onion', 'pyaz'], prefer: [], avoid: [...PROCESSED, 'spring', 'sambar', 'sambhar', 'baby', 'white', 'organic', 'shallot'], approxG: 150 },
  { id: 'desi-tomato', name: 'Desi Tomato', qty: 1, unit: 'kg', query: 'desi tomato', must: ['tomato', 'tamatar'], prefer: ['desi', 'local', 'country', 'deshi', 'nati'], avoid: [...PROCESSED, 'hybrid', 'cherry', 'organic', 'green'], approxG: 100 },
  { id: 'hybrid-tomato', name: 'Hybrid Tomato', qty: 1, unit: 'kg', query: 'hybrid tomato', must: ['tomato', 'tamatar'], prefer: ['hybrid'], avoid: [...PROCESSED, 'desi', 'local', 'cherry', 'organic', 'green'], approxG: 100 },
  { id: 'hybrid-cucumber', name: 'Hybrid Cucumber', qty: 1, unit: 'kg', query: 'cucumber', must: ['cucumber', 'kheera', 'khira'], prefer: ['hybrid', 'green', 'desi', 'local'], avoid: [...PROCESSED, 'english', 'seedless', 'organic'], approxG: 200 },
  { id: 'english-cucumber', name: 'English Cucumber', qty: 1, unit: 'kg', query: 'english cucumber', must: ['english'], prefer: ['cucumber'], avoid: [...PROCESSED, 'organic'], approxG: 300 },
  { id: 'green-capsicum', name: 'Green Capsicum', qty: 1, unit: 'kg', query: 'green capsicum', must: ['capsicum', 'shimla mirch'], prefer: ['green'], avoid: [...PROCESSED, 'red', 'yellow', 'colored', 'coloured', 'mixed', 'organic'], approxG: 150 },
  { id: 'green-chilli', name: 'Green Chilli', qty: 1, unit: 'kg', query: 'green chilli', must: ['chilli', 'chili', 'mirchi'], prefer: ['green'], avoid: [...PROCESSED, 'red', 'dry', 'capsicum', 'organic', 'bhavnagri', 'jalapeno'], approxG: 5 },
  { id: 'iceberg-lettuce', name: 'Iceberg Lettuce', qty: 1, unit: 'kg', query: 'iceberg lettuce', must: ['iceberg'], prefer: ['lettuce'], avoid: [...PROCESSED, 'organic', 'hydroponic'], approxG: 400 },
  { id: 'pineapple', name: 'Pineapple', qty: 1, unit: 'pc', query: 'pineapple', must: ['pineapple', 'ananas'], prefer: [], avoid: [...PROCESSED, 'canned', 'chunks', 'tidbits'], approxG: 1000 },
  { id: 'banana', name: 'Banana', qty: 1, unit: 'kg', query: 'banana', must: ['banana', 'kela'], prefer: ['robusta'], avoid: [...PROCESSED, 'raw', 'red', 'flower', 'stem', 'organic', 'nendran'], approxG: 150 },
  { id: 'bottle-gourd', name: 'Bottle Gourd', qty: 1, unit: 'pc', query: 'bottle gourd', must: ['bottle gourd', 'lauki', 'ghiya', 'dudhi'], prefer: [], avoid: [...PROCESSED, 'organic', 'round'], approxG: 700 },
  { id: 'broccoli', name: 'Broccoli', qty: 1, unit: 'kg', query: 'broccoli', must: ['broccoli'], prefer: [], avoid: [...PROCESSED, 'organic', 'florets', 'micro', 'baby'], approxG: 300 },
  { id: 'cabbage', name: 'Cabbage', qty: 1, unit: 'pc', query: 'cabbage', must: ['cabbage', 'patta gobi', 'band gobi'], prefer: ['green'], avoid: [...PROCESSED, 'red', 'purple', 'chinese', 'organic'], approxG: 700 },
  { id: 'cauliflower', name: 'Cauliflower', qty: 1, unit: 'pc', query: 'cauliflower', must: ['cauliflower', 'phool gobi', 'gobhi'], prefer: [], avoid: [...PROCESSED, 'organic', 'florets', 'mini'], approxG: 600 },
  { id: 'french-beans', name: 'French Beans', qty: 1, unit: 'kg', query: 'french beans', must: ['beans'], prefer: ['french', 'haricot'], avoid: [...PROCESSED, 'cluster', 'broad', 'cowpea', 'kidney', 'rajma', 'baked', 'coffee', 'cocoa', 'organic'], approxG: 5 },
  { id: 'kiran-watermelon', name: 'Kiran - Watermelon', qty: 1, unit: 'pc', query: 'kiran watermelon', must: ['watermelon', 'water melon'], prefer: ['kiran'], avoid: [...PROCESSED, 'cut'], approxG: 2000 },
  { id: 'papaya', name: 'Papaya', qty: 1, unit: 'pc', query: 'papaya', must: ['papaya'], prefer: [], avoid: [...PROCESSED, 'raw', 'cut', 'leaves', 'leaf'], approxG: 1000 },
  { id: 'pomegranate', name: 'Pomegranate', qty: 1, unit: 'kg', query: 'pomegranate', must: ['pomegranate', 'anar'], prefer: [], avoid: [...PROCESSED, 'arils', 'kernels', 'organic'], approxG: 250 },
  { id: 'pumpkin-yellow', name: 'Pumpkin Yellow', qty: 1, unit: 'pc', query: 'yellow pumpkin', must: ['pumpkin', 'kaddu', 'kashiphal'], prefer: ['yellow', 'red'], avoid: [...PROCESSED, 'green', 'ash', 'white', 'organic'], approxG: 1500 },
  { id: 'apple-shimla-big', name: 'Apple (Shimla Big)', qty: 1, unit: 'kg', query: 'shimla apple', must: ['apple'], prefer: ['shimla', 'himachal', 'royal', 'big', 'large'], avoid: [...PROCESSED, 'small', 'mini', 'baby', 'green', 'fuji', 'gala', 'washington', 'kinnaur', 'custard', 'cider', 'vinegar', 'organic', 'iphone', 'ipad'], approxG: 200 },
  { id: 'coriander', name: 'Coriander Bunch', qty: 1, unit: 'bunch', query: 'coriander', must: ['coriander', 'dhania'], prefer: ['bunch', 'leaves', 'fresh'], avoid: [...PROCESSED, 'organic', 'whole'], approxG: 100 },
  { id: 'garlic', name: 'Garlic', qty: 1, unit: 'kg', query: 'garlic', must: ['garlic', 'lahsun'], prefer: [], avoid: [...PROCESSED, 'organic', 'black', 'single clove', 'snow mountain', 'bread', 'mayo'], approxG: 40 },
  { id: 'ginger', name: 'Ginger', qty: 1, unit: 'kg', query: 'ginger', must: ['ginger', 'adrak'], prefer: [], avoid: [...PROCESSED, 'organic', 'mango ginger', 'ale', 'garlic', 'tea', 'biscuit'], approxG: 50 },
  { id: 'green-kiwi', name: 'Green Kiwi', qty: 3, unit: 'pc', query: 'green kiwi', must: ['kiwi'], prefer: ['green'], avoid: [...PROCESSED, 'gold', 'golden'], approxG: 80 },
  { id: 'lemon', name: 'Lemon', qty: 1, unit: 'kg', query: 'lemon', must: ['lemon', 'nimbu'], prefer: [], avoid: [...PROCESSED, 'grass', 'tea', 'soda', 'drink', 'organic', 'sweet'], approxG: 50 },
  { id: 'mint', name: 'Mint Leaves', qty: 1, unit: 'bunch', query: 'mint leaves', must: ['mint', 'pudina'], prefer: ['leaves', 'bunch'], avoid: [...PROCESSED, 'chutney', 'mouth', 'gum', 'organic', 'tea'], approxG: 100 },
  { id: 'small-shimla-apple', name: 'Small Shimla Apple', qty: 1, unit: 'kg', query: 'small shimla apple', must: ['apple'], prefer: ['small', 'shimla', 'mini', 'baby', 'himachal'], avoid: [...PROCESSED, 'green', 'fuji', 'gala', 'washington', 'custard', 'cider', 'vinegar', 'organic', 'iphone', 'ipad'], approxG: 120 },
  { id: 'sponge-gourd', name: 'Sponge Gourd', qty: 1, unit: 'kg', query: 'sponge gourd', must: ['sponge gourd', 'tori', 'turai', 'gilki', 'luffa'], prefer: ['sponge'], avoid: [...PROCESSED, 'ridge', 'organic'], approxG: 150 },
];
