import { CircularProgress, Box } from '@mui/material'

export default function Loading() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
      <CircularProgress />
    </Box>
  )
}

