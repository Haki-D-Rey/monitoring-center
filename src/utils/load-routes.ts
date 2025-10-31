/* eslint-disable @typescript-eslint/no-require-imports */
import { Application, Router } from 'express'
import fs from 'fs'
import path from 'path'

interface RouteGroup {
  prefix: string
  folder: string
}

export const loadRoutes = (app: Application, routeGroups: RouteGroup[]) => {
  const loadEntry = (basePrefix: string, entryPath: string) => {
    if (!fs.existsSync(entryPath)) {
      console.warn(`⚠️ No existe: ${entryPath}`)
      return
    }

    const stat = fs.statSync(entryPath)

    if (stat.isDirectory()) {
      const entries = fs.readdirSync(entryPath)
      entries.forEach(e => loadEntry(`${basePrefix}/${e.replace(/\.(ts|js)$/, '')}`, path.join(entryPath, e)))
    } else if (stat.isFile() && (entryPath.endsWith('.ts') || entryPath.endsWith('.js'))) {
       
      const router: Router = require(entryPath).default
      if (!router) {
        console.warn(`⚠️ No se encontró export default en ${entryPath}`)
        return
      }
      const fileName = path.basename(entryPath).replace(/\.(ts|js)$/, '')
      const finalPath = basePrefix.endsWith(fileName) ? basePrefix : `${basePrefix}/${fileName}`

      app.use(finalPath, router)
      console.log(`📦 Ruta cargada: ${finalPath}`)
    }
  }

  routeGroups.forEach(({ prefix, folder }) => {
    const resolved = path.resolve(folder)
    loadEntry(prefix, resolved)
  })
}
