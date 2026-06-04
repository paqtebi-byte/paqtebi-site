import{r,W as c,o,V as i}from"./index-CQXXR9_1.js";/**
 * @license lucide-react v0.554.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d=[["path",{d:"M10 11v6",key:"nco0om"}],["path",{d:"M14 11v6",key:"outv1u"}],["path",{d:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",key:"miytrc"}],["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",key:"e791ji"}]],C=r("trash-2",d),f=e=>{const[s,n]=c.useState([]),t=async()=>{n(e?await o.fetchComments(e):await o.fetchComments())};return c.useEffect(()=>{t()},[e]),{comments:s,addComment:async a=>{await o.insertComment(a),await t()},removeComment:async a=>{await o.deleteComment(a),await t()},addReaction:async(a,m)=>{await o.addReaction(a,m),await t()},refreshComments:t}},w=e=>{if(!e)return"";try{return i.sanitize(e,{ALLOWED_TAGS:[],ALLOWED_ATTR:[]})}catch{return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}};export{C as T,w as s,f as u};
