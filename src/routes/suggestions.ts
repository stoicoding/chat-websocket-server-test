import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';

const router = Router();

router.get('/replySuggestion', async (_: Request, res: Response) => {
  logger.info('[SuggestionsRoute] GET /suggestions - Fetching reply suggestions');
  const allSuggestions = [
    "はい、承知しました 👍", "了解です！頑張ります 💪", "ごめんなさい 🙏", 
    "わかります、同感です 🤝", "お願いします 🙇‍♂️", "すごいですね！ ✨", 
    "なるほど、勉強になります 📚", "そうですね 🤔", "そういう考え方も 🧐", 
    "素晴らしいアイデアです 💡", "がんばりましょう！ 🎉", 
    "同意します 👌", "面白いです 🎧", "素敵です！ 🌟", "その通りです 🤓"
  ];
  const count = Math.floor(Math.random() * 3) + 3;
  logger.debug(`[SuggestionsRoute] Selecting ${count} random suggestions from pool of ${allSuggestions.length}`);
  const suggestions = allSuggestions
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
  await new Promise(resolve => setTimeout(resolve, 1000));
  logger.info(`[SuggestionsRoute] Successfully generated ${suggestions.length} reply suggestions`);
  res.json(suggestions);
});

export default router;
