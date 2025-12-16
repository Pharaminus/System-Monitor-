import request from 'supertest'
import express from 'express'

// Minimal smoke tests against the running server endpoints by importing index
import './..//src/index'

describe('API smoke', () => {
  it('can get login token', async () => {
    const res = await request('http://localhost:4000').post('/api/v1/login').send({ username: 'test' })
    expect(res.status).toBe(200)
    expect(res.body.token).toBeDefined()
  }, 10000)
})
