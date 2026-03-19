export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. 登录入口：用户点 Login 会访问 https://你的域名/auth
    if (url.pathname === "/auth") {
      const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&scope=repo,user`;
      return Response.redirect(githubAuthUrl, 302);
    }

    // 2. 回调：GitHub 验证通过后会带 code 访问 https://你的域名/callback
    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      const response = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "accept": "application/json",
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });
      const result = await response.json();

      // 返回给 Decap CMS 窗口的脚本
      const html = `
        <!DOCTYPE html>
        <html>
        <body>
          <script>
            window.opener.postMessage(
              "authorization:github:success:" + JSON.stringify({
                token: "${result.access_token}",
                provider: "github"
              }),
              window.location.origin
            );
          </script>
        </body>
        </html>
      `;
      return new Response(html, { headers: { "content-type": "text/html" } });
    }

    // 3. 静态资源转发（这是最关键的）
    // 如果不是登录路径，就去拿你的前端 HTML、JS、图片等文件
    return env.ASSETS.fetch(request);
  }
};