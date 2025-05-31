

const express = require('express');
const { getAllAds, getAds, getAdsbyAdsPage, uploadSliderImages, deleteAdImage } = require('../controllers/adsController');

const router = express.Router();


router.get('/getAllAds',getAllAds);
router.get('/getAds',getAds);
router.get('/getAdsByPage',getAdsbyAdsPage);
router.post('/uploadSliderImages',uploadSliderImages);
router.delete('/deleteAd',deleteAdImage)


module.exports = router;