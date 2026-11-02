import { fireEvent, render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

function renderSelect(onValueChange = vi.fn()) {
  render(
    <Select value="a" onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue>{(v) => String(v)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Comida</SelectLabel>
          <SelectItem value="a">Arroz</SelectItem>
          <SelectItem value="b">Café molido</SelectItem>
        </SelectGroup>
        <SelectGroup>
          <SelectLabel>Hogar</SelectLabel>
          <SelectItem value="c">Detergente</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  )
  fireEvent.click(screen.getByRole('combobox'))
  return onValueChange
}

const search = () => screen.findByRole('searchbox', { name: 'Buscar opciones' })

describe('Select — buscador de opciones', () => {
  it('filtra por fragmento sin distinguir acentos', async () => {
    renderSelect()

    fireEvent.change(await search(), { target: { value: 'cafe' } })

    expect(screen.getByRole('option', { name: 'Café molido' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Arroz' })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Detergente' })).not.toBeInTheDocument()
  })

  it('sin coincidencias avisa con el texto buscado', async () => {
    renderSelect()

    fireEvent.change(await search(), { target: { value: 'leche' } })

    expect(screen.getByText('Sin resultados para «leche»')).toBeInTheDocument()
  })

  it('Enter en el buscador elige la primera coincidencia', async () => {
    const onValueChange = renderSelect()
    const input = await search()

    fireEvent.change(input, { target: { value: 'deter' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onValueChange).toHaveBeenCalledWith('c', expect.anything())
  })

  it('escribir no dispara la búsqueda por letra de la lista', async () => {
    const onValueChange = renderSelect()
    const input = await search()

    fireEvent.keyDown(input, { key: 'd' })

    expect(onValueChange).not.toHaveBeenCalled()
    expect(input).toBeInTheDocument()
  })
})
