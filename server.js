const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA = path.join(ROOT, "data", "db.json");
const UPLOADS = path.join(ROOT, "uploads");

fs.mkdirSync(path.dirname(DATA), {recursive:true});
fs.mkdirSync(UPLOADS, {recursive:true});

const initial = {
  users: [],
  anime: [{
    id: 1, title: "Shadow Reborn", year: 2026,
    genres: ["Action","Fantasy","School"],
    description: "Kai phát hiện mình có khả năng nhìn thấy các cánh cổng dẫn đến những vùng đất khác.",
    poster: "", banner: "", status: "Đang phát hành",
    episodes: Array.from({length:12},(_,i)=>({
      id:i+1, number:i+1, title:`Tập ${i+1}`, video:"", subtitle:""
    }))
  }]
};
if (!fs.existsSync(DATA)) fs.writeFileSync(DATA, JSON.stringify(initial,null,2));

function db(){ return JSON.parse(fs.readFileSync(DATA,"utf8")); }
function save(x){ fs.writeFileSync(DATA, JSON.stringify(x,null,2)); }
function auth(req,res,next){ if(req.session.user) return next(); res.status(401).json({error:"Chưa đăng nhập"}); }

app.use(express.json({limit:"2mb"}));
app.use(express.urlencoded({extended:true}));
app.use(session({
  secret: process.env.SESSION_SECRET || "change-this-secret-in-production",
  resave:false, saveUninitialized:false,
  cookie:{httpOnly:true, sameSite:"lax", secure:false, maxAge:86400000}
}));
app.use(express.static(path.join(ROOT,"public")));
app.use("/uploads", express.static(UPLOADS));

const upload = multer({
  storage: multer.diskStorage({
    destination: (_,__,cb)=>cb(null,UPLOADS),
    filename: (_,file,cb)=>cb(null,Date.now()+"-"+file.originalname.replace(/[^a-zA-Z0-9._-]/g,"_"))
  }),
  limits:{fileSize: 2*1024*1024*1024}
});

app.post("/api/setup", async (req,res)=>{
  const data=db();
  if(data.users.length) return res.status(400).json({error:"Admin đã được tạo"});
  const {username,password} = req.body;
  if(!username || !password || password.length<8) return res.status(400).json({error:"Username và mật khẩu tối thiểu 8 ký tự là bắt buộc"});
  data.users.push({id:1,username,password:await bcrypt.hash(password,12),role:"admin"});
  save(data);
  res.json({ok:true});
});

app.post("/api/login", async (req,res)=>{
  const data=db(), user=data.users.find(u=>u.username===req.body.username);
  if(!user || !(await bcrypt.compare(req.body.password||"",user.password))) return res.status(401).json({error:"Sai tài khoản hoặc mật khẩu"});
  req.session.user={id:user.id,username:user.username,role:user.role};
  res.json({ok:true,user:req.session.user});
});
app.post("/api/logout",(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get("/api/me",(req,res)=>res.json({user:req.session.user||null}));

app.get("/api/anime",(req,res)=>res.json(db().anime));
app.get("/api/anime/:id",(req,res)=>{
  const a=db().anime.find(x=>x.id===Number(req.params.id));
  if(!a) return res.status(404).json({error:"Không tìm thấy anime"});
  res.json(a);
});

app.post("/api/anime",auth,(req,res)=>{
  const data=db(), body=req.body;
  const item={
    id:Date.now(), title:body.title||"Anime mới", year:Number(body.year)||2026,
    genres:Array.isArray(body.genres)?body.genres:String(body.genres||"").split(",").map(x=>x.trim()).filter(Boolean),
    description:body.description||"", poster:body.poster||"", banner:body.banner||"",
    status:body.status||"Sắp ra mắt", episodes:[]
  };
  data.anime.unshift(item); save(data); res.json(item);
});
app.put("/api/anime/:id",auth,(req,res)=>{
  const data=db(), a=data.anime.find(x=>x.id===Number(req.params.id));
  if(!a) return res.status(404).json({error:"Không tìm thấy anime"});
  Object.assign(a,{title:req.body.title??a.title,year:Number(req.body.year)||a.year,
    genres:Array.isArray(req.body.genres)?req.body.genres:a.genres,
    description:req.body.description??a.description,poster:req.body.poster??a.poster,
    banner:req.body.banner??a.banner,status:req.body.status??a.status});
  save(data); res.json(a);
});
app.delete("/api/anime/:id",auth,(req,res)=>{
  const data=db(); data.anime=data.anime.filter(x=>x.id!==Number(req.params.id)); save(data); res.json({ok:true});
});

app.post("/api/anime/:id/episodes",auth,(req,res)=>{
  const data=db(), a=data.anime.find(x=>x.id===Number(req.params.id));
  if(!a) return res.status(404).json({error:"Không tìm thấy anime"});
  const ep={id:Date.now(),number:Number(req.body.number),title:req.body.title||`Tập ${req.body.number}`,video:req.body.video||"",subtitle:req.body.subtitle||""};
  a.episodes.push(ep); a.episodes.sort((x,y)=>x.number-y.number); save(data); res.json(ep);
});
app.delete("/api/anime/:id/episodes/:ep",auth,(req,res)=>{
  const data=db(), a=data.anime.find(x=>x.id===Number(req.params.id));
  if(!a) return res.status(404).json({error:"Không tìm thấy anime"});
  a.episodes=a.episodes.filter(e=>e.id!==Number(req.params.ep)); save(data); res.json({ok:true});
});

app.post("/api/upload",auth,upload.single("video"),(req,res)=>{
  if(!req.file) return res.status(400).json({error:"Chưa chọn file"});
  res.json({url:"/uploads/"+req.file.filename,name:req.file.originalname,size:req.file.size});
});

app.get("*",(req,res)=>{
  res.sendFile(path.join(ROOT,"public","index.html"));
});
app.listen(PORT,()=>console.log(`AnimeVN running at http://localhost:${PORT}`));
