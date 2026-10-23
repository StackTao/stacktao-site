(function () {
  window.Resume = {
    mount: function (view) {
      var button = view.querySelector('[data-resume-print]')
      if (!button) return
      button.onclick = async function () {
        var status = view.querySelector('[data-resume-status]')
        button.disabled = true
        status.textContent = '正在准备字体…'
        try {
          if (document.fonts) await document.fonts.ready
          if (!button.isConnected) return
          status.textContent = '在打印窗口选择「另存为 PDF」，使用 A4、100% 缩放，并关闭页眉和页脚。'
          window.print()
        } catch (error) {
          status.textContent = '未能打开打印窗口，请使用浏览器菜单中的「打印」。'
        } finally { button.disabled = false }
      }
    }
  }
})()
